# TSETMC Stock Market Dashboard

A modern, real-time dashboard for visualizing Tehran Stock Exchange market data using FastAPI and React with MUI X components.

## Features

- **Real-time Market Overview**: DataGrid displaying all stocks with latest prices
- **Interactive Charts**: Historical price and volume charts using Recharts
- **Stock Details**: Comprehensive view with financial indicators and client type data
- **Dark Mode UI**: Modern, responsive design with Material-UI
- **Sector Filtering**: Filter stocks by industry sector
- **Market Statistics**: Overview cards showing market-wide metrics

## Tech Stack

### Backend (FastAPI)
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: Database ORM
- **Pydantic**: Data validation
- **Uvicorn**: ASGI server

### Frontend (React)
- **React 18**: UI framework
- **Material-UI (MUI) v5**: Component library
- **MUI X DataGrid**: Free version for data tables
- **Recharts**: Charting library
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Vite**: Fast build tool

## Installation

### Prerequisites

- Python 3.8+
- Node.js 18+
- npm or yarn

### Backend Setup

1. **Install Python dependencies**:
   ```bash
   cd D:\Bourse
   pip install -r requirements.txt
   pip install -r requirements-dashboard.txt
   ```

2. **Ensure database is initialized**:
   ```bash
   python scripts/init_db.py
   ```

3. **Start the FastAPI server**:
   ```bash
   python api/main.py
   ```

   Or with uvicorn:
   ```bash
   uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at: http://localhost:8000

   API Documentation: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

   The dashboard will be available at: http://localhost:3000

## Usage

### Starting the Dashboard

1. **Start Backend** (in one terminal):
   ```bash
   python api/main.py
   ```

2. **Start Frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Dashboard**:
   Open http://localhost:3000 in your browser

### Building for Production

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

   Production files will be in `frontend/dist/`

2. **Serve with FastAPI** (optional):
   You can configure FastAPI to serve the built frontend files.

## API Endpoints

### Market Data

- `GET /api/companies` - List all companies
  - Query params: `active_only`, `sector`, `limit`

- `GET /api/sectors` - Get list of all sectors

- `GET /api/market-overview` - Get market overview with latest prices
  - Query params: `sector`, `limit`

- `GET /api/stocks/{symbol}` - Get detailed stock information

- `GET /api/stocks/{symbol}/history` - Get historical price data
  - Query params: `days` (default: 30, max: 365)

### System

- `GET /api/status` - Get scraper execution status

- `GET /api/stats` - Get overall market statistics

### API Documentation

Interactive API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Dashboard Pages

### 1. Dashboard (Home)
- Market statistics cards (total companies, active today, volume, latest date)
- Top 10 active stocks table
- Quick navigation to stock details

### 2. Market Overview
- Full market data table with MUI X DataGrid
- Sortable and filterable columns
- Sector filter dropdown
- Pagination (10, 25, 50, 100 rows per page)
- Click on row to view stock details

### 3. Stock Detail
- Company information and trading status
- Latest price with change indicators
- 30-day price chart (line chart)
- Volume chart (bar chart)
- Financial indicators (P/E, EPS, Market Cap, 52-week high/low)
- Client type activity (individual vs institutional traders)

## Development

### Project Structure

```
D:\Bourse\
├── api/                    # FastAPI backend
│   ├── __init__.py
│   ├── main.py            # FastAPI application
│   └── schemas.py         # Pydantic schemas
│
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   │   └── Layout.jsx
│   │   ├── pages/         # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MarketOverview.jsx
│   │   │   └── StockDetail.jsx
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── database/              # Database models and connection
├── tsetmc_scraper/        # Scrapy spiders
└── requirements-dashboard.txt
```

### Customization

#### Adding New Chart Types

To add new charts, import from Recharts:
```jsx
import { AreaChart, Area, PieChart, Pie } from 'recharts'
```

#### Changing Theme

Edit `frontend/src/main.jsx`:
```jsx
const theme = createTheme({
  palette: {
    mode: 'dark', // or 'light'
    primary: {
      main: '#90caf9', // your color
    },
  },
})
```

#### Adding New API Endpoints

1. Add endpoint in `api/main.py`
2. Add schema in `api/schemas.py` if needed
3. Call from frontend using axios

## Troubleshooting

### Backend Issues

**Port already in use**:
```bash
# Change port in api/main.py or use different port
uvicorn api.main:app --port 8001
```

**Database not found**:
```bash
# Initialize database first
python scripts/init_db.py
```

**CORS errors**:
- Ensure CORS middleware is configured in `api/main.py`
- Check that frontend is making requests to correct backend URL

### Frontend Issues

**Module not found**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build errors**:
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

**Proxy not working**:
- Check `vite.config.js` proxy configuration
- Ensure backend is running on port 8000

## Performance

### Backend Optimization

- Database indexes are already configured in models
- Consider using PostgreSQL for better performance with large datasets
- Add caching layer (Redis) for frequently accessed data

### Frontend Optimization

- DataGrid virtualization is enabled by default
- Lazy load charts only when needed
- Consider implementing infinite scroll for large datasets

## Next Steps

Potential enhancements:
- [ ] Add real-time WebSocket updates
- [ ] Implement user authentication
- [ ] Add watchlist functionality
- [ ] Export data to CSV/Excel
- [ ] Add technical indicators (RSI, MACD, etc.)
- [ ] Mobile responsive optimization
- [ ] Add notifications/alerts
- [ ] Implement comparison charts (multiple stocks)

## License

This dashboard is part of the TSETMC scraper project. For educational and research purposes.

## Support

For issues:
1. Check API documentation at http://localhost:8000/docs
2. Review browser console for frontend errors
3. Check FastAPI logs for backend errors
4. Ensure database has data (run scrapers first)

---

**Current Status**: Production-ready v1.0

**Last Updated**: February 2026
