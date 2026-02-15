"""
FastAPI main application
Provides REST API for TSETMC stock market data
"""
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import sys
import subprocess
from pathlib import Path


def format_date(d_even: int) -> str:
    """Convert YYYYMMDD integer to formatted date string"""
    if not d_even:
        return None
    date_str = str(d_even)
    if len(date_str) == 8:
        year = date_str[0:4]
        month = date_str[4:6]
        day = date_str[6:8]
        return f"{year}-{month}-{day}"
    return str(d_even)

# Add parent directory to path to import database modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import get_db_manager
from database.models import Company, DailyPrice, FinancialIndicator, ClientType, ScraperStatus
from config.settings import DATABASE_URL
from api.schemas import (
    CompanySchema,
    DailyPriceSchema,
    FinancialIndicatorSchema,
    ClientTypeSchema,
    MarketOverviewSchema,
    StockDetailSchema,
    ScraperStatusSchema
)

app = FastAPI(
    title="TSETMC Stock Market API",
    description="Real-time and historical data for Tehran Stock Exchange",
    version="1.0.0"
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database manager
db_manager = get_db_manager(DATABASE_URL)

def get_db():
    """Dependency to get database session"""
    with db_manager.get_session() as session:
        yield session


@app.get("/")
def read_root():
    """Root endpoint - API information"""
    return {
        "name": "TSETMC Stock Market API",
        "version": "1.0.0",
        "endpoints": {
            "companies": "/api/companies",
            "market_overview": "/api/market-overview",
            "stock_detail": "/api/stocks/{symbol}",
            "historical_prices": "/api/stocks/{symbol}/history",
            "scraper_status": "/api/status"
        }
    }


@app.get("/api/companies", response_model=List[CompanySchema])
def get_companies(
    active_only: bool = True,
    sector: Optional[str] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get list of all companies"""
    query = db.query(Company)

    if active_only:
        query = query.filter(Company.is_active == True)

    if sector:
        query = query.filter(Company.sector_name_fa == sector)

    if limit:
        companies = query.limit(limit).all()
    else:
        companies = query.all()

    return companies


@app.get("/api/sectors")
def get_sectors(db: Session = Depends(get_db)):
    """Get list of all sectors"""
    sectors = db.query(Company.sector_name_fa).distinct().all()
    return [s[0] for s in sectors if s[0]]


@app.get("/api/market-overview", response_model=List[MarketOverviewSchema])
def get_market_overview(
    sector: Optional[str] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get market overview with latest prices for all stocks"""
    # Get the latest date from daily_prices
    latest_date_result = db.query(DailyPrice.d_even).order_by(DailyPrice.d_even.desc()).first()

    if not latest_date_result:
        return []

    latest_date = latest_date_result[0]

    # Query companies with their latest prices
    query = db.query(
        Company,
        DailyPrice,
        FinancialIndicator
    ).join(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).outerjoin(
        FinancialIndicator,
        (Company.ins_code == FinancialIndicator.ins_code) &
        (FinancialIndicator.d_even == latest_date)
    ).filter(
        Company.is_active == True,
        DailyPrice.d_even == latest_date
    )

    if sector:
        query = query.filter(Company.sector_name_fa == sector)

    if limit:
        results = query.limit(limit).all()
    else:
        results = query.all()

    market_data = []
    for company, price, financial in results:
        market_data.append(MarketOverviewSchema(
            ins_code=company.ins_code,
            symbol=company.symbol,
            name_fa=company.name_fa,
            sector_name_fa=company.sector_name_fa,
            date=format_date(price.d_even),
            price_last=float(price.price_last) if price.price_last else 0,
            price_change=float(price.price_change) if price.price_change else 0,
            price_change_percent=float(price.price_change_percent) if price.price_change_percent else 0,
            q_tot_tran_5j=price.q_tot_tran_5j or 0,
            q_tot_cap=price.q_tot_cap or 0,
            z_tot_tran=price.z_tot_tran or 0,
            price_min=float(price.price_min) if price.price_min else 0,
            price_max=float(price.price_max) if price.price_max else 0,
            pe_ratio=float(financial.pe_ratio) if financial and financial.pe_ratio else None,
            eps=float(financial.eps) if financial and financial.eps else None,
            market_cap=financial.market_cap if financial else None
        ))

    return market_data


@app.get("/api/stocks/{symbol}", response_model=StockDetailSchema)
def get_stock_detail(symbol: str, db: Session = Depends(get_db)):
    """Get detailed information for a specific stock"""
    # Get company
    company = db.query(Company).filter(Company.symbol == symbol).first()

    if not company:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    # Get latest price
    latest_price = db.query(DailyPrice).filter(
        DailyPrice.ins_code == company.ins_code
    ).order_by(DailyPrice.d_even.desc()).first()

    # Get latest financial indicators
    latest_financial = db.query(FinancialIndicator).filter(
        FinancialIndicator.ins_code == company.ins_code
    ).order_by(FinancialIndicator.d_even.desc()).first()

    # Get latest client type data
    latest_client_type = db.query(ClientType).filter(
        ClientType.ins_code == company.ins_code
    ).order_by(ClientType.d_even.desc()).first()

    return StockDetailSchema(
        company=company,
        latest_price=latest_price,
        financial_indicator=latest_financial,
        client_type=latest_client_type
    )


@app.get("/api/stocks/{symbol}/history", response_model=List[DailyPriceSchema])
def get_stock_history(
    symbol: str,
    days: int = Query(default=30, le=365),
    db: Session = Depends(get_db)
):
    """Get historical price data for a stock"""
    # Get company
    company = db.query(Company).filter(Company.symbol == symbol).first()

    if not company:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    # Get historical prices
    prices = db.query(DailyPrice).filter(
        DailyPrice.ins_code == company.ins_code
    ).order_by(DailyPrice.d_even.desc()).limit(days).all()

    # Reverse to get chronological order
    return list(reversed(prices))


@app.get("/api/status", response_model=List[ScraperStatusSchema])
def get_scraper_status(limit: int = Query(default=10, le=100), db: Session = Depends(get_db)):
    """Get scraper execution status"""
    statuses = db.query(ScraperStatus).order_by(
        ScraperStatus.start_time.desc()
    ).limit(limit).all()

    return statuses


@app.get("/api/stats")
def get_statistics(db: Session = Depends(get_db)):
    """Get overall market statistics"""
    total_companies = db.query(Company).filter(Company.is_active == True).count()

    # Get latest date
    latest_date_result = db.query(DailyPrice.d_even).order_by(DailyPrice.d_even.desc()).first()
    latest_date = latest_date_result[0] if latest_date_result else None

    # Count companies with data on latest date
    companies_with_data = 0
    total_volume = 0
    total_value = 0

    if latest_date:
        prices_today = db.query(DailyPrice).filter(DailyPrice.d_even == latest_date).all()
        companies_with_data = len(prices_today)
        total_volume = sum(p.q_tot_tran_5j or 0 for p in prices_today)
        total_value = sum(p.q_tot_cap or 0 for p in prices_today)

    return {
        "total_companies": total_companies,
        "companies_with_data_today": companies_with_data,
        "latest_date": latest_date,
        "latest_date_formatted": format_date(latest_date) if latest_date else None,
        "total_volume_today": total_volume,
        "total_value_today": total_value
    }


@app.post("/api/scraper/run/{spider_name}")
def run_scraper(spider_name: str, background_tasks: BackgroundTasks):
    """Trigger a scraper manually"""
    allowed_spiders = ['market_watch', 'instrument_details', 'historical_prices']

    if spider_name not in allowed_spiders:
        raise HTTPException(status_code=400, detail=f"Invalid spider name. Allowed: {allowed_spiders}")

    def run_spider_task(spider: str):
        """Background task to run spider"""
        try:
            subprocess.run(
                [sys.executable, "-m", "scrapy", "crawl", spider, "-s", "LOG_LEVEL=INFO"],
                check=True,
                capture_output=True
            )
        except subprocess.CalledProcessError as e:
            print(f"Spider {spider} failed: {e}")

    background_tasks.add_task(run_spider_task, spider_name)

    return {
        "status": "started",
        "spider": spider_name,
        "message": f"Scraper {spider_name} started in background. Check /api/status for progress."
    }


@app.post("/api/scraper/update-all")
def update_all_data(background_tasks: BackgroundTasks):
    """Run both market_watch and instrument_details scrapers"""

    def run_all_spiders():
        """Background task to run all spiders in parallel"""
        from concurrent.futures import ThreadPoolExecutor

        def run_spider(spider):
            try:
                subprocess.run(
                    [sys.executable, "-m", "scrapy", "crawl", spider, "-s", "LOG_LEVEL=INFO"],
                    check=True,
                    capture_output=True
                )
            except subprocess.CalledProcessError as e:
                print(f"Spider {spider} failed: {e}")

        spiders = ['market_watch', 'instrument_details']
        with ThreadPoolExecutor(max_workers=2) as executor:
            executor.map(run_spider, spiders)

    background_tasks.add_task(run_all_spiders)

    return {
        "status": "started",
        "spiders": ["market_watch", "instrument_details"],
        "message": "All scrapers started in parallel. This may take ~5 minutes. Check /api/status for progress."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
