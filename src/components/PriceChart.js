'use client';

import { Line, Chart } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale,
    LineController
} from 'chart.js';
import { useState, useMemo, useEffect } from 'react';
import { formatPrice, formatNumber, formatPercentage } from '@/lib/dataService';
import { CandleChart } from './CandleChart';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale,
    LineController
);

/**
 * PriceChart Component
 * Interactive 7-day price chart with comprehensive coin details for top 10 cryptocurrencies
 */
export default function PriceChart({ marketData, loading }) {
    const [selectedCoin, setSelectedCoin] = useState(null);
    const [chartType, setChartType] = useState('line'); // 'line' | 'candlestick'
    const [ohlcData, setOhlcData] = useState(null);
    const [loadingOhlc, setLoadingOhlc] = useState(false);

    // Get top 10 coins for selection
    const topCoins = useMemo(() => {
        if (!marketData) return [];
        return marketData.slice(0, 10);
    }, [marketData]);

    // Set default selected coin
    if (!selectedCoin && topCoins.length > 0) {
        setSelectedCoin(topCoins[0]);
    }

    // Reset OHLC when coin changes
    useEffect(() => {
        setOhlcData(null);
        setChartType('line');
    }, [selectedCoin?.id]);

    // Fetch OHLC data when candlestick is selected
    useEffect(() => {
        const fetchOhlc = async () => {
            if (chartType === 'candlestick' && !ohlcData && selectedCoin?.id) {
                setLoadingOhlc(true);
                try {
                    const res = await fetch(`/api/coin/${selectedCoin.id}/ohlc?days=7`);
                    const json = await res.json();
                    if (json.success) {
                        setOhlcData(json.data);
                    }
                } catch (err) {
                    console.error('Failed to fetch OHLC', err);
                } finally {
                    setLoadingOhlc(false);
                }
            }
        };
        fetchOhlc();
    }, [chartType, selectedCoin?.id, ohlcData]);

    const chartData = useMemo(() => {
        if (!selectedCoin) return null;

        if (chartType === 'candlestick') {
            if (!ohlcData) return null;
            // Pass raw OHLC data - CandleChart handles the transformation
            return ohlcData;
        }

        // Line Chart (Sparkline) Logic
        if (!selectedCoin.sparkline?.length) return null;
        const sparkline = selectedCoin.sparkline;

        // Generate timestamps for x-axis to work with TimeScale if desired, 
        // OR keep CategoryScale behavior. To allow toggling, we might need to change scale type dynamically.
        // For simplicity, Line chart here was using 'box' labels (Category). 
        // But Candlestick NEEDS TimeScale. 
        // Solution: Line chart can also use TimeScale if we generate timestamps back from "now".

        const now = Date.now();
        const hourlyData = sparkline.map((price, i) => {
            // sparkline is last 7 days (168 hours). i=0 is oldest.
            // Wait, CoinGcko sparkline is usually hourly? 7 days = 168 points?
            // If sparkline.length is variable, we assume equal intervals ending at "now".
            const hoursAgo = sparkline.length - 1 - i;
            return {
                x: now - (hoursAgo * 60 * 60 * 1000),
                y: price
            };
        });

        const isPositive = selectedCoin.priceChange7d >= 0;
        const color = isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
        const bgColor = isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

        return {
            datasets: [
                {
                    label: `${selectedCoin.name} Price`,
                    data: hourlyData,
                    borderColor: color,
                    backgroundColor: bgColor,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: color,
                }
            ]
        };
    }, [selectedCoin, chartType, ohlcData]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context) => {
                        const val = context.raw.y || context.raw.c || context.raw;
                        return `$${Number(val).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: val < 1 ? 6 : 2
                        })}`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'MMM d'
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false,
                },
                ticks: {
                    color: '#9CA3AF',
                    maxTicksLimit: 7,
                    font: {
                        size: 10
                    }
                }
            },
            y: {
                position: 'right',
                grid: {
                    color: 'rgba(75, 85, 99, 0.1)',
                },
                ticks: {
                    color: '#9CA3AF',
                    font: {
                        size: 10
                    },
                    callback: (value) => `$${value.toLocaleString()}`
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="price-chart-container">
                <h2 className="section-title">7-Day Price Chart</h2>
                <div className="chart-skeleton"></div>
            </div>
        );
    }

    return (
        <div className="price-chart-container">
            <div className="chart-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>7-Day Price Chart</h2>
                    <div className="chart-toggle" style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px',
                        borderRadius: '6px',
                        display: 'flex',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <button
                            onClick={() => setChartType('line')}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: chartType === 'line' ? 'rgba(59, 130, 246, 0.5)' : 'transparent',
                                color: chartType === 'line' ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            Line
                        </button>
                        <button
                            onClick={() => setChartType('candlestick')}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: chartType === 'candlestick' ? 'rgba(59, 130, 246, 0.5)' : 'transparent',
                                color: chartType === 'candlestick' ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            Candle
                        </button>
                    </div>
                </div>
                <div className="coin-selector">
                    {topCoins.map(coin => (
                        <button
                            key={coin.id}
                            onClick={() => setSelectedCoin(coin)}
                            className={`coin-btn ${selectedCoin?.id === coin.id ? 'active' : ''}`}
                        >
                            <img src={coin.image} alt={coin.name} className="btn-icon" />
                            {coin.symbol}
                        </button>
                    ))}
                </div>
            </div>

            {selectedCoin && (
                <>
                    {/* Coin Header with Price */}
                    <div className="chart-coin-header">
                        <img src={selectedCoin.image} alt={selectedCoin.name} className="chart-coin-icon" />
                        <div className="chart-coin-info">
                            <div className="chart-coin-name-row">
                                <span className="chart-coin-name">{selectedCoin.name}</span>
                                <span className="chart-coin-symbol">{selectedCoin.symbol}</span>
                                <span className="chart-coin-rank">Rank #{selectedCoin.rank}</span>
                            </div>
                            <div className="chart-coin-price-row">
                                <span className="chart-coin-price">{formatPrice(selectedCoin.currentPrice)}</span>
                                <span className={`chart-coin-change ${selectedCoin.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                                    {selectedCoin.priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(selectedCoin.priceChange24h).toFixed(2)}% (24h)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Comprehensive Stats Grid */}
                    <div className="chart-stats-grid">
                        <div className="chart-stat">
                            <span className="chart-stat-label">Market Cap</span>
                            <span className="chart-stat-value">${formatNumber(selectedCoin.marketCap)}</span>
                        </div>
                        <div className="chart-stat">
                            <span className="chart-stat-label">24h Volume</span>
                            <span className="chart-stat-value">${formatNumber(selectedCoin.volume24h)}</span>
                        </div>
                        <div className="chart-stat">
                            <span className="chart-stat-label">24h High</span>
                            <span className="chart-stat-value">{formatPrice(selectedCoin.high24h)}</span>
                        </div>
                        <div className="chart-stat">
                            <span className="chart-stat-label">24h Low</span>
                            <span className="chart-stat-value">{formatPrice(selectedCoin.low24h)}</span>
                        </div>
                        <div className="chart-stat">
                            <span className="chart-stat-label">1h Change</span>
                            <span className={`chart-stat-value ${selectedCoin.priceChange1h >= 0 ? 'positive' : 'negative'}`}>
                                {formatPercentage(selectedCoin.priceChange1h)}
                            </span>
                        </div>
                        <div className="chart-stat">
                            <span className="chart-stat-label">7d Change</span>
                            <span className={`chart-stat-value ${selectedCoin.priceChange7d >= 0 ? 'positive' : 'negative'}`}>
                                {formatPercentage(selectedCoin.priceChange7d)}
                            </span>
                        </div>
                        <div className="chart-stat">
                            <span className="chart-stat-label">All-Time High</span>
                            <span className="chart-stat-value">{formatPrice(selectedCoin.ath)}</span>
                        </div>
                        <div className="chart-stat">
                            <span className="chart-stat-label">ATH Change</span>
                            <span className={`chart-stat-value ${selectedCoin.athChangePercentage >= 0 ? 'positive' : 'negative'}`}>
                                {formatPercentage(selectedCoin.athChangePercentage)}
                            </span>
                        </div>
                    </div>

                    {/* Supply Info */}
                    <div className="chart-supply-row">
                        <div className="supply-item">
                            <span className="supply-label">Circulating Supply:</span>
                            <span className="supply-value">{formatNumber(selectedCoin.circulatingSupply)} {selectedCoin.symbol}</span>
                        </div>
                        {selectedCoin.totalSupply && (
                            <div className="supply-item">
                                <span className="supply-label">Total Supply:</span>
                                <span className="supply-value">{formatNumber(selectedCoin.totalSupply)} {selectedCoin.symbol}</span>
                            </div>
                        )}
                        <div className="supply-item">
                            <span className="supply-label">Vol/MCap Ratio:</span>
                            <span className="supply-value">{(selectedCoin.volumeToMarketCap * 100).toFixed(2)}%</span>
                        </div>
                    </div>
                </>
            )}

            <div className="chart-wrapper">
                {loadingOhlc ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                        Loading Candlestick Data...
                    </div>
                ) : chartData ? (
                    chartType === 'candlestick' ? (
                        <CandleChart data={chartData} />
                    ) : (
                        <Chart
                            key={chartType}
                            type="line"
                            data={chartData}
                            options={chartOptions}
                        />
                    )
                ) : (
                    <div className="no-chart-data">No chart data available</div>
                )}
            </div>
        </div>
    );
}
