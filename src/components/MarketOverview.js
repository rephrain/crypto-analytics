'use client';

import { formatNumber, formatPercentage } from '@/lib/dataService';

/**
 * MetricCard Component
 * Displays a single metric with label, value, and optional change indicator
 */
function MetricCard({ label, value, change, icon }) {
    const isPositive = change >= 0;

    return (
        <div className="metric-card">
            <div className="metric-header">
                <span className="metric-icon">{icon}</span>
                <span className="metric-label">{label}</span>
            </div>
            <div className="metric-value">{value}</div>
            {change !== undefined && (
                <div className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '↑' : '↓'} {formatPercentage(change)}
                </div>
            )}
        </div>
    );
}

/**
 * MarketOverview Component
 * Displays global market statistics in a grid of cards
 */
export default function MarketOverview({ data, loading }) {
    if (loading) {
        return (
            <div className="market-overview">
                <h2 className="section-title">Global Market Overview</h2>
                <div className="metrics-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="metric-card skeleton">
                            <div className="skeleton-text"></div>
                            <div className="skeleton-value"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="market-overview">
                <h2 className="section-title">Global Market Overview</h2>
                <div className="error-message">Unable to load market data</div>
            </div>
        );
    }

    return (
        <div className="market-overview">
            <h2 className="section-title">Global Market Overview</h2>
            <div className="metrics-grid">
                <MetricCard
                    label="Total Market Cap"
                    value={`$${formatNumber(data.totalMarketCap)}`}
                    change={data.marketCapChange24h}
                    icon="💰"
                />
                <MetricCard
                    label="24h Volume"
                    value={`$${formatNumber(data.totalVolume24h)}`}
                    icon="📈"
                />
                <MetricCard
                    label="BTC Dominance"
                    value={`${data.btcDominance?.toFixed(1)}%`}
                    icon="₿"
                />
                <MetricCard
                    label="ETH Dominance"
                    value={`${data.ethDominance?.toFixed(1)}%`}
                    icon="⟠"
                />
                <MetricCard
                    label="Active Cryptocurrencies"
                    value={data.activeCryptocurrencies?.toLocaleString()}
                    icon="🪙"
                />
                <MetricCard
                    label="Markets"
                    value={data.markets?.toLocaleString()}
                    icon="🏛️"
                />
            </div>
        </div>
    );
}
