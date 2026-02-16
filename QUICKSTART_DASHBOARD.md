# Quick Start Guide - TSETMC Dashboard

Get your dashboard running in 5 minutes!

## Prerequisites Check

```bash
# Check Python version (need 3.8+)
python --version

# Check Node.js version (need 18+)
node --version

# Check npm
npm --version
```

## Step 1: Install Backend Dependencies

```bash
# Navigate to project directory
cd D:\Bourse

# Install Python packages
pip install -r requirements.txt
pip install -r requirements-dashboard.txt
```

## Step 2: Initialize Database (if not done already)

```bash
# Initialize the database
python scripts/init_db.py

# Optional: Import sample data if you have JSON files
python scripts/import_json_data.py
```

## Step 3: Run a Scraper to Get Data

```bash
# Scrape market watch data (takes ~1-2 minutes)
python -m scrapy crawl market_watch

# Or scrape instrument details
python -m scrapy crawl instrument_details
```

## Step 4: Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install Node packages
npm install
```

## Step 5: Start the Dashboard

### Option A: Using the Start Script (Windows)

```bash
# From D:\Bourse directory
start_dashboard.bat
```

### Option B: Manual Start

**Terminal 1 - Start Backend:**
```bash
cd D:\Bourse
python api/main.py
```

**Terminal 2 - Start Frontend:**
```bash
cd D:\Bourse\frontend
npm run dev
```

## Step 6: Access the Dashboard

Open your browser and navigate to:

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Backend API**: http://localhost:8000

## What You Should See

### Dashboard Home Page
- Market statistics cards
- Top 10 active stocks table
- Navigation sidebar

### Market Overview Page
- Full data table with all stocks
- Sector filter dropdown
- Sortable columns
- Click any row to see stock details

### Stock Detail Page
- Price chart (30 days)
- Volume chart
- Financial indicators
- Client type activity

## Troubleshooting

### No Data Showing?

1. **Run a scraper first**:
   ```bash
   python -m scrapy crawl market_watch
   ```

2. **Check if database has data**:
   ```bash
   python scripts/view_data.py
   ```

### Backend Not Starting?

1. **Check if port 8000 is available**:
   ```bash
   # Change port in api/main.py if needed
   uvicorn api.main:app --port 8001
   ```

2. **Check database path**:
   - Ensure `data/tsetmc.db` exists
   - Run `python scripts/init_db.py` if not

### Frontend Not Starting?

1. **Clear node modules**:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node version**:
   ```bash
   node --version  # Should be 18+
   ```

### CORS Errors?

- Make sure backend is running on port 8000
- Frontend proxy is configured in `vite.config.js`

## Next Steps

### Keep Data Fresh

Run the scheduler to automatically update data:
```bash
python scheduler/scheduler.py
```

This will:
- Update market data every 2 minutes during trading hours
- Update company details daily
- Backfill historical data weekly

### Customize the Dashboard

- **Change theme**: Edit `frontend/src/main.jsx`
- **Add new pages**: Create files in `frontend/src/pages/`
- **Add new API endpoints**: Edit `api/main.py`

## Data Flow

```
TSETMC Website
      ↓
   Scrapy Spiders
      ↓
   SQLite Database
      ↓
   FastAPI Backend
      ↓
   React Frontend
      ↓
    Your Browser
```

## Useful Commands

```bash
# View API documentation
# Open http://localhost:8000/docs

# Run scraper manually
python -m scrapy crawl market_watch

# Check scraper status
python scripts/view_data.py

# Export data to JSON
python scripts/export_all_data.py

# Start scheduler (auto-updates)
python scheduler/scheduler.py
```

## Getting Help

- Check DASHBOARD_README.md for detailed documentation
- Check README.md for scraper documentation
- API docs: http://localhost:8000/docs
- Check logs in `logs/` directory

Enjoy your TSETMC dashboard! 🚀
