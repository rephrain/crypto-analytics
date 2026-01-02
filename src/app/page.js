'use client';

import { useState, useEffect, useCallback } from 'react';
import MarketOverview from '@/components/MarketOverview';
import MarketAnalysis from '@/components/MarketAnalysis';
import CryptoTable from '@/components/CryptoTable';
import TrendingCoins from '@/components/TrendingCoins';
import PriceChart from '@/components/PriceChart';

/**
 * Main Dashboard Page
 * Real-Time Crypto Market Analytics Dashboard
 * 
 * Features:
 * - Auto-refresh every 30 seconds
 * - Global market overview
 * - Top cryptocurrencies table
 * - Trending coins section
 * - Interactive price charts
 */
export default function Home() {
  const [globalData, setGlobalData] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch all data from API routes
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const [globalRes, marketRes, trendingRes] = await Promise.all([
        fetch('/api/global'),
        fetch('/api/market'),
        fetch('/api/trending')
      ]);

      const [globalJson, marketJson, trendingJson] = await Promise.all([
        globalRes.json(),
        marketRes.json(),
        trendingRes.json()
      ]);

      if (globalJson.success) setGlobalData(globalJson.data);
      if (marketJson.success) setMarketData(marketJson.data);
      if (trendingJson.success) setTrendingData(trendingJson.data);

      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false); // Don't show loading state on refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <main className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="logo">
              CryptoMetrics
            </h1>
            <span className="tagline">Real-Time Market Analytics</span>
          </div>

          <div className="header-actions">
            <button
              onClick={() => fetchData(true)}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? '⟳ Updating...' : '↻ Refresh'}
            </button>

            {lastUpdated && (
              <span className="last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="pipeline-indicator">
          <span className={`pipeline-status ${loading ? 'fetching' : 'idle'}`}>
            {loading ? 'Fetching...' : 'Live'}
          </span>
          <span className="auto-refresh">Auto-refresh: 30s</span>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchData(true)}>Retry</button>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Market Overview Section */}
        <section className="dashboard-section">
          <MarketOverview data={globalData} loading={loading} />
        </section>

        {/* Market Analysis */}
        <section className="dashboard-section">
          <MarketAnalysis />
        </section>

        {/* Trending + Chart Section */}
        <section className="dashboard-section two-column">
          <TrendingCoins data={trendingData} marketData={marketData} loading={loading} />
          <PriceChart marketData={marketData} loading={loading} />
        </section>

        {/* Crypto Table Section */}
        <section className="dashboard-section">
          <CryptoTable data={marketData} loading={loading} />
        </section>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-info">
            <p>
              <strong>CryptoMetrics</strong>
            </p>
            <p className="footer-description">
              © {new Date().getFullYear()} Rephrain Archaimeric. All rights reserved.
            </p>
          </div>

          <div className="footer-tech">
            <span className="tech-badge">Next.js 14</span>
            <span className="tech-badge">CoinGecko API</span>
            <span className="tech-badge">Chart.js</span>
            <span className="tech-badge">Vercel</span>
          </div>

          <div className="data-source">
            Data provided by <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer">CoinGecko</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
