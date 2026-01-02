# CryptoMetrics - Real-Time Crypto Market Analytics Dashboard

A **Data Engineering & Big Data** portfolio project demonstrating ETL pipelines, real-time data processing, and interactive analytics visualization.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![License](https://img.shields.io/badge/license-MIT-green) ![Deploy](https://img.shields.io/badge/Vercel-Deployed-blue)

## Live Demo

**[View Live Dashboard →](https://your-vercel-url.vercel.app)** 

---

## Project Overview

### Business Problem
Cryptocurrency traders need real-time market insights consolidated from multiple sources, but premium analytics tools are often expensive and complex.

### Solution
A free, live dashboard that provides instant access to:
- Global market statistics (total market cap, volume, dominance)
- Top 50 cryptocurrencies with real-time prices
- Price change tracking (1h, 24h, 7d)
- Interactive 7-day price charts
- Trending/hot coins
- Sortable tables with search functionality

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   EXTRACT   │───►│  TRANSFORM  │───►│    LOAD     │         │
│  │ CoinGecko   │    │  Normalize  │    │   Cache +   │         │
│  │    API      │    │  Calculate  │    │   Serve     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  GET /api/market   - Top cryptocurrencies data                  │
│  GET /api/global   - Global market statistics                   │
│  GET /api/trending - Trending coins                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER (React)                    │
├─────────────────────────────────────────────────────────────────┤
│  • Market Overview Cards                                        │
│  • Interactive Price Charts (Chart.js)                          │
│  • Sortable Crypto Table with Sparklines                        │
│  • Trending Coins Section                                       │
│  • Auto-refresh every 30 seconds                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Engineering Concepts Demonstrated

| Concept | Implementation |
|---------|----------------|
| **ETL Pipeline** | Extract from API → Transform/normalize → Load to cache |
| **Data Caching** | In-memory cache with 30s TTL to respect rate limits |
| **Retry Logic** | Exponential backoff for API failures |
| **Real-time Processing** | Auto-refresh with configurable intervals |
| **Error Handling** | Graceful degradation with fallback responses |
| **Scalable Architecture** | Serverless functions on Vercel |

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 14 (React) | Server-side rendering, API routes |
| **Styling** | Vanilla CSS | Premium dark mode design |
| **Charts** | Chart.js + react-chartjs-2 | Interactive visualizations |
| **Data Source** | CoinGecko API (Free) | Real-time crypto data |
| **Hosting** | Vercel (Free) | Serverless deployment |

---

## Project Structure

```
crypto-analytics/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── market/route.js    # Market data endpoint
│   │   │   ├── global/route.js    # Global stats endpoint
│   │   │   └── trending/route.js  # Trending coins endpoint
│   │   ├── globals.css            # Design system
│   │   ├── layout.js              # Root layout with SEO
│   │   └── page.js                # Main dashboard
│   ├── components/
│   │   ├── MarketOverview.js      # Global metrics cards
│   │   ├── CryptoTable.js         # Sortable table with search
│   │   ├── TrendingCoins.js       # Trending section
│   │   └── PriceChart.js          # Interactive chart
│   └── lib/
│       └── dataService.js         # ETL pipeline core
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/crypto-analytics.git
cd crypto-analytics

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

---

## Deployment (Vercel)

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/crypto-analytics)

### Option 2: Manual Deploy
1. Push code to GitHub
2. Visit [vercel.com](https://vercel.com)
3. Import your repository
4. Click Deploy

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/market` | GET | Top 50 cryptocurrencies with prices, volumes, charts |
| `/api/market?limit=20` | GET | Limit results (max 100) |
| `/api/global` | GET | Total market cap, volume, BTC/ETH dominance |
| `/api/trending` | GET | Currently trending coins |

### Example Response

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "count": 50,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "source": "CoinGecko",
    "cached": false
  }
}
```

---

## Features

- **Real-time Data** - Auto-refreshes every 30 seconds
- **Interactive Charts** - 7-day price sparklines and detailed charts
- **Sortable Tables** - Click headers to sort by any metric
- **Search** - Find coins by name or symbol
- **Responsive** - Works on desktop, tablet, and mobile
- **Premium UI** - Dark mode with gradients and animations
- **Error Handling** - Graceful degradation when API fails
- **SEO Optimized** - Meta tags for social sharing

---

## License

MIT License - Feel free to use this project in your portfolio!

---

## Acknowledgments

- Data provided by [CoinGecko](https://www.coingecko.com)
- Hosted on [Vercel](https://vercel.com)

---

**Built as a Data Engineering Portfolio Project** 🚀
