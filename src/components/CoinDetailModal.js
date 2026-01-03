'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import { formatPrice, formatNumber, formatPercentage } from '@/lib/dataService';
import { CandleChart } from './CandleChart';

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
    CandlestickController,
    CandlestickElement,
    LineController
);

export default function CoinDetailModal({ coin: initialCoin, onClose }) {
    const [coin, setCoin] = useState(initialCoin);
    const [details, setDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(true);

    // New Data States
    const [tickers, setTickers] = useState(null);
    const [loadingTickers, setLoadingTickers] = useState(false);
    const [ohlc, setOhlc] = useState(null);
    const [loadingOhlc, setLoadingOhlc] = useState(false);
    const [chartType, setChartType] = useState('line'); // 'line' | 'candlestick'

    const [activeTab, setActiveTab] = useState('overview');

    // Restore full data if we only have partial data
    useEffect(() => {
        const fetchDetails = async () => {
            if (!initialCoin.id) return;

            try {
                // Fetch rich details (description, links, contract)
                const response = await fetch(`/api/coin/${initialCoin.id}`);
                const result = await response.json();

                if (result.success) {
                    setDetails(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch extended coin details", error);
            } finally {
                setLoadingDetails(false);
            }
        };

        fetchDetails();
    }, [initialCoin.id]);

    // Fetch Tickers when Markets tab is active
    useEffect(() => {
        if (activeTab === 'markets' && !tickers && !loadingTickers) {
            const fetchTickers = async () => {
                setLoadingTickers(true);
                try {
                    const res = await fetch(`/api/coin/${initialCoin.id}/tickers`);
                    const json = await res.json();
                    if (json.success) setTickers(json.data);
                } catch (e) {
                    console.error("Failed to fetch tickers", e);
                } finally {
                    setLoadingTickers(false);
                }
            };
            fetchTickers();
        }
    }, [activeTab, initialCoin.id, tickers, loadingTickers]);

    // Fetch OHLC when Analysis tab is active
    useEffect(() => {
        if (activeTab === 'analysis' && !ohlc && !loadingOhlc) {
            const fetchOhlc = async () => {
                setLoadingOhlc(true);
                try {
                    const res = await fetch(`/api/coin/${initialCoin.id}/ohlc?days=30`);
                    const json = await res.json();
                    if (json.success) setOhlc(json.data);
                } catch (e) {
                    console.error("Failed to fetch OHLC", e);
                } finally {
                    setLoadingOhlc(false);
                }
            };
            fetchOhlc();
        }
    }, [activeTab, initialCoin.id, ohlc, loadingOhlc]);

    const chartData = useMemo(() => {
        if (chartType === 'candlestick') {
            if (!ohlc) return null;
            // Pass raw OHLC data - CandleChart handles the transformation
            return ohlc;
        }

        // Use sparkline from initialData if available (instant), else wait for details
        const sparkline = initialCoin.sparkline || details?.market_data?.sparkline_7d?.price;
        if (!sparkline || !sparkline.length) return null;

        const labels = sparkline.map((_, i) => {
            // For line chart, we can stick to simple labels or convert to time
            // To support switching back and forth, using time is better but requires mapping sparkline to timestamps?
            // Existing logic uses labels.
            const hoursAgo = sparkline.length - i;
            const days = Math.floor(hoursAgo / 24);
            if (days === 0) return `${hoursAgo % 24}h`;
            if (days === 1) return '1d';
            return `${days}d`;
        });

        // If using 'time' scale for both, we need x/y structure for Line too.
        // Let's keep it simple: Line uses existing logic with Category scale, Candlestick uses Time scale.
        // ChartJS handles scale changes if we swap datasets and options.
        // BUT chart options are defined below. 

        const step = Math.ceil(sparkline.length / 14);
        const displayLabels = labels.map((label, i) => i % step === 0 ? label : '');

        // Determine color based on 7d change
        const priceChange7d = initialCoin.priceChange7d ?? details?.market_data?.price_change_percentage_7d;
        const isPositive = (priceChange7d || 0) >= 0;
        const color = isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
        const bgColor = isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';

        return {
            labels: chartType === 'line' ? displayLabels : undefined,
            datasets: [
                {
                    label: `${initialCoin.name} Price (USD)`,
                    data: sparkline,
                    borderColor: color,
                    backgroundColor: bgColor,
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: color,
                }
            ]
        };
    }, [initialCoin, details, chartType, ohlc]);

    // Fetch OHLC on demand
    useEffect(() => {
        if (chartType === 'candlestick' && !ohlc && initialCoin?.id) {
            setLoadingOhlc(true);
            const fetchOhlc = async () => {
                try {
                    const res = await fetch(`/api/coin/${initialCoin.id}/ohlc?days=30`); // 30 days for better candle view
                    const json = await res.json();
                    if (json.success) setOhlc(json.data);
                } catch (e) {
                    console.error('OHLC fetch error', e);
                } finally {
                    setLoadingOhlc(false);
                }
            };
            fetchOhlc();
        }
    }, [chartType, ohlc, initialCoin?.id]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 14,
                displayColors: false,
                callbacks: {
                    label: (context) => {
                        const val = context.raw.y || context.raw.c || context.raw;
                        return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: val < 1 ? 8 : 2 })}`
                    }
                }
            }
        },
        scales: {
            x: chartType === 'candlestick' ? {
                type: 'time',
                time: { unit: 'day' },
                grid: { display: false },
                ticks: { color: 'rgba(255,255,255,0.5)' }
            } : {
                grid: { display: false },
                ticks: { display: false }
            },
            y: { position: 'right', grid: { color: 'rgba(255,255,255,0.05)' } }
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('modal-backdrop')) onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
    };

    return (
        <div
            className="modal-backdrop"
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            style={{ zIndex: 1000 }}
        >
            <div className="modal-content detailed-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                {/* Header */}
                <div className="modal-header">
                    <img
                        src={details?.image?.large || initialCoin.image || initialCoin.thumb}
                        alt={initialCoin.name}
                        className="modal-coin-icon"
                    />
                    <div className="modal-coin-info">
                        <h2 className="modal-coin-name">{details?.name || initialCoin.name}</h2>
                        <span className="modal-coin-symbol">{(details?.symbol || initialCoin.symbol)?.toUpperCase()}</span>
                        <span className="modal-coin-rank">Rank #{details?.market_cap_rank || initialCoin.marketCapRank || '?'}</span>
                        {details?.genesis_date && (
                            <span className="modal-coin-genesis" style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Genesis: {details.genesis_date}
                            </span>
                        )}
                    </div>
                    <div className="modal-price-section">
                        <span className="modal-price">
                            {formatPrice(details?.market_data?.current_price?.usd || initialCoin.currentPrice)}
                        </span>
                        {(() => {
                            const change = details?.market_data?.price_change_percentage_24h ?? initialCoin.priceChange24h;
                            if (change !== undefined && change !== null) {
                                return (
                                    <span className={`modal-change ${change >= 0 ? 'positive' : 'negative'}`}>
                                        {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(2)}% (24h)
                                    </span>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button className={`modal-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                        Overview
                    </button>
                    <button className={`modal-tab ${activeTab === 'markets' ? 'active' : ''}`} onClick={() => setActiveTab('markets')}>
                        Markets
                    </button>
                    <button className={`modal-tab ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
                        Analysis
                    </button>
                    <button className={`modal-tab ${activeTab === 'technical' ? 'active' : ''}`} onClick={() => setActiveTab('technical')}>
                        Technical
                    </button>
                    <button className={`modal-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
                        Info & Links
                    </button>
                    <button className={`modal-tab ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>
                        Community
                    </button>
                    <button className={`modal-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
                        About
                    </button>
                </div>

                <div className="modal-body scrollable-y">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Main Price Stats */}
                            <div className="modal-stats">
                                <div className="modal-stat">
                                    <span className="stat-label">Market Cap</span>
                                    <span className="stat-value">${formatNumber(details?.market_data?.market_cap?.usd || initialCoin.marketCap)}</span>
                                    {details?.market_data?.market_cap_change_percentage_24h || initialCoin.marketCapChangePercentage24h && (
                                        <span className="stat-change" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {formatPercentage(details.market_data.market_cap_change_percentage_24h || initialCoin.marketCapChangePercentage24h)}
                                        </span>
                                    )}
                                </div>
                                <div className="modal-stat">
                                    <span className="stat-label">24h Volume</span>
                                    <span className="stat-value">${formatNumber(details?.market_data?.total_volume?.usd || initialCoin.volume24h)}</span>
                                </div>
                                <div className="modal-stat">
                                    <span className="stat-label">Volume/Market Cap</span>
                                    <span className="stat-value">
                                        {(() => {
                                            const vol = details?.market_data?.total_volume?.usd || initialCoin.volume24h;
                                            const mc = details?.market_data?.market_cap?.usd || initialCoin.marketCap;
                                            return mc ? ((vol / mc) * 100).toFixed(2) + '%' : 'N/A';
                                        })()}
                                    </span>
                                </div>
                                <div className="modal-stat">
                                    <span className="stat-label">FDV</span>
                                    <span className="stat-value">${formatNumber(details?.market_data?.fully_diluted_valuation?.usd || initialCoin.fullyDilutedValuation)}</span>
                                </div>
                            </div>

                            {/* 24h High/Low */}
                            <div className="modal-stats">
                                <div className="modal-stat">
                                    <span className="stat-label">24h High</span>
                                    <span className="stat-value" style={{ color: 'var(--success)' }}>
                                        {formatPrice(details?.market_data?.high_24h?.usd || initialCoin.high24h)}
                                    </span>
                                </div>
                                <div className="modal-stat">
                                    <span className="stat-label">24h Low</span>
                                    <span className="stat-value" style={{ color: 'var(--danger)' }}>
                                        {formatPrice(details?.market_data?.low_24h?.usd || initialCoin.low24h)}
                                    </span>
                                </div>
                                <div className="modal-stat">
                                    <span className="stat-label">24h Change</span>
                                    <span className="stat-value">
                                        {formatPrice(details?.market_data?.price_change_24h || initialCoin.priceChange24h)}
                                    </span>
                                </div>
                                <div className="modal-stat">
                                    <span className="stat-label">Market Cap Rank</span>
                                    <span className="stat-value">#{details?.market_cap_rank || initialCoin.marketCapRank || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="modal-chart-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="modal-chart-title" style={{ marginBottom: 0 }}>Price History {chartType === 'candlestick' ? '(30d)' : '(7d)'}</h3>
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
                                <div className="h-64 sm:h-80 w-full relative">
                                    {loadingOhlc ? (
                                        <div className="loading-chart flex items-center justify-center h-full">Loading Candlestick Data...</div>
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
                                        <div className="loading-chart">Loading Chart...</div>
                                    )}
                                </div>
                            </div>

                            {/* Supply Stats */}
                            <div className="info-section">
                                <h4>Supply Information</h4>
                                <div className="modal-stats">
                                    <div className="modal-stat">
                                        <span className="stat-label">Circulating Supply</span>
                                        <span className="stat-value">{formatNumber(details?.market_data?.circulating_supply || initialCoin.circulatingSupply)}</span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">Total Supply</span>
                                        <span className="stat-value">{formatNumber(details?.market_data?.total_supply || initialCoin.totalSupply)}</span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">Max Supply</span>
                                        <span className="stat-value">
                                            {formatNumber(details?.market_data?.max_supply || initialCoin.maxSupply) || 'Unlimited'}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">Supply Ratio</span>
                                        <span className="stat-value">
                                            {(() => {
                                                const circ = details?.market_data?.circulating_supply || initialCoin.circulatingSupply;
                                                const max = details?.market_data?.max_supply || initialCoin.maxSupply;
                                                return max ? ((circ / max) * 100).toFixed(2) + '%' : 'N/A';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ATH/ATL Stats */}
                            <div className="info-section">
                                <h4>All-Time High & Low</h4>
                                <div className="modal-stats">
                                    <div className="modal-stat">
                                        <span className="stat-label">ATH</span>
                                        <span className="stat-value" style={{ color: 'var(--success)' }}>
                                            {formatPrice(details?.market_data?.ath?.usd || initialCoin.ath)}
                                        </span>
                                        <span
                                            className={`stat-change stat-value ${(
                                                details?.market_data?.ath_change_percentage?.usd ??
                                                details?.market_data?.ath_change_percentage ??
                                                initialCoin.athChangePercentage ??
                                                0
                                            ) >= 0
                                                ? 'positive'
                                                : 'negative'
                                                }`}
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            {formatPercentage(details?.market_data?.ath_change_percentage?.usd || initialCoin.athChangePercentage)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">ATH Date</span>
                                        <span className="stat-value" style={{ fontSize: '0.9rem' }}>
                                            {details?.market_data?.ath_date?.usd
                                                ? new Date(details.market_data.ath_date.usd).toLocaleDateString()
                                                : initialCoin.athDate ? new Date(initialCoin.athDate).toLocaleDateString() : 'N/A'
                                            }
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">ATL</span>
                                        <span className="stat-value" style={{ color: 'var(--danger)' }}>
                                            {formatPrice(details?.market_data?.atl?.usd || initialCoin.atl)}
                                        </span>
                                        <span
                                            className={`stat-change stat-value ${(
                                                details?.market_data?.atl_change_percentage?.usd ??
                                                details?.market_data?.atl_change_percentage ??
                                                initialCoin.atlChangePercentage ??
                                                0
                                            ) >= 0
                                                ? 'positive'
                                                : 'negative'}`}
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            {formatPercentage(details?.market_data?.atl_change_percentage?.usd || initialCoin.atlChangePercentage)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">ATL Date</span>
                                        <span className="stat-value" style={{ fontSize: '0.9rem' }}>
                                            {details?.market_data?.atl_date?.usd
                                                ? new Date(details.market_data.atl_date.usd).toLocaleDateString()
                                                : initialCoin.atlDate ? new Date(initialCoin.atlDate).toLocaleDateString() : 'N/A'
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Price Change Timeline */}
                            <div className="info-section">
                                <h4>Price Performance</h4>
                                <div className="modal-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                                    <div className="modal-stat">
                                        <span className="stat-label">1h</span>
                                        <span className={`stat-value ${(details?.market_data?.price_change_percentage_1h_in_currency?.usd || details?.market_data?.price_change_percentage_1h || initialCoin.priceChange1h || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercentage(details?.market_data?.price_change_percentage_1h_in_currency?.usd ?? details?.market_data?.price_change_percentage_1h ?? initialCoin.priceChange1h)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">24h</span>
                                        <span className={`stat-value ${(details?.market_data?.price_change_percentage_24h_in_currency?.usd || details?.market_data?.price_change_percentage_24h || initialCoin.priceChange24h || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercentage(details?.market_data?.price_change_percentage_24h_in_currency?.usd ?? details?.market_data?.price_change_percentage_24h ?? initialCoin.priceChange24h)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">7d</span>
                                        <span className={`stat-value ${(details?.market_data?.price_change_percentage_7d_in_currency?.usd || details?.market_data?.price_change_percentage_7d || initialCoin.priceChange7d || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercentage(details?.market_data?.price_change_percentage_7d_in_currency?.usd ?? details?.market_data?.price_change_percentage_7d ?? initialCoin.priceChange7d)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">14d</span>
                                        <span className={`stat-value ${(details?.market_data?.price_change_percentage_14d_in_currency?.usd || details?.market_data?.price_change_percentage_14d || initialCoin.priceChange14d || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercentage(details?.market_data?.price_change_percentage_14d_in_currency?.usd ?? details?.market_data?.price_change_percentage_14d ?? initialCoin.priceChange14d)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">30d</span>
                                        <span className={`stat-value ${(details?.market_data?.price_change_percentage_30d_in_currency?.usd || details?.market_data?.price_change_percentage_30d || initialCoin.priceChange30d || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercentage(details?.market_data?.price_change_percentage_30d_in_currency?.usd ?? details?.market_data?.price_change_percentage_30d ?? initialCoin.priceChange30d)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">60d</span>
                                        <span className={`stat-value ${(details?.market_data?.price_change_percentage_60d_in_currency?.usd || details?.market_data?.price_change_percentage_60d || initialCoin.priceChange60d || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercentage(details?.market_data?.price_change_percentage_60d_in_currency?.usd ?? details?.market_data?.price_change_percentage_60d ?? initialCoin.priceChange60d)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">200d</span>
                                        <span className={`stat-value ${(details?.market_data?.price_change_percentage_200d_in_currency?.usd || details?.market_data?.price_change_percentage_200d || initialCoin.priceChange200d || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercentage(details?.market_data?.price_change_percentage_200d_in_currency?.usd ?? details?.market_data?.price_change_percentage_200d ?? initialCoin.priceChange200d)}
                                        </span>
                                    </div>
                                    <div className="modal-stat">
                                        <span className="stat-label">1y</span>
                                        <span className={`stat-value ${(details?.market_data?.price_change_percentage_1y_in_currency?.usd || details?.market_data?.price_change_percentage_1y || initialCoin.priceChange1y || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercentage(details?.market_data?.price_change_percentage_1y_in_currency?.usd ?? details?.market_data?.price_change_percentage_1y ?? initialCoin.priceChange1y)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* MARKETS TAB */}
                    {activeTab === 'markets' && (
                        <div className="markets-tab-content">
                            {loadingTickers ? (
                                <div className="loading-spinner">Loading Market Pairs...</div>
                            ) : !tickers || tickers.length === 0 ? (
                                <div className="info-section"><p>No market data available.</p></div>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                        <p>Showing {tickers.length} trading pairs</p>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="tickers-table">
                                            <thead>
                                                <tr>
                                                    <th>Exchange</th>
                                                    <th>Pair</th>
                                                    <th>Price</th>
                                                    <th>Volume (24h)</th>
                                                    <th>Spread</th>
                                                    <th>Trust</th>
                                                    <th>Updated</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tickers.map((t, i) => (
                                                    <tr key={i}>
                                                        <td>
                                                            <strong>{t.market?.name || 'Unknown'}</strong>
                                                            {t.market?.has_trading_incentive && (
                                                                <span style={{ marginLeft: '5px', fontSize: '0.75rem', color: 'orange' }}>⭐</span>
                                                            )}
                                                        </td>
                                                        <td className="pair-cell">
                                                            {t.trade_url ? (
                                                                <a href={t.trade_url} target="_blank" rel="noreferrer">
                                                                    {t.base}/{t.target}
                                                                </a>
                                                            ) : (
                                                                <span>{t.base}/{t.target}</span>
                                                            )}
                                                        </td>
                                                        <td>{formatPrice(t.last)}</td>
                                                        <td>${formatNumber(t.volume)}</td>
                                                        <td>{t.bid_ask_spread_percentage?.toFixed(2)}%</td>
                                                        <td>
                                                            <center><span className={`trust-dot trust-${t.trust_score}`} /></center>
                                                        </td>
                                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {t.last_traded_at ? new Date(t.last_traded_at).toLocaleTimeString() : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ANALYSIS TAB (OHLC) */}
                    {activeTab === 'analysis' && (
                        <div className="analysis-tab-content">
                            {loadingOhlc ? (
                                <div className="loading-spinner">Loading OHLC Data...</div>
                            ) : !ohlc || ohlc.length === 0 ? (
                                <div className="info-section"><p>No analysis data available.</p></div>
                            ) : (
                                <>
                                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                        OHLC Candlestick Data (Last 30 Days)
                                    </h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="tickers-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Open</th>
                                                    <th>High</th>
                                                    <th>Low</th>
                                                    <th>Close</th>
                                                    <th>Change</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ohlc.slice(0, 20).map((row, i) => {
                                                    const change = ((row.close - row.open) / row.open) * 100;
                                                    return (
                                                        <tr key={i}>
                                                            <td>{new Date(row.timestamp).toLocaleDateString()}</td>
                                                            <td>{formatPrice(row.open)}</td>
                                                            <td style={{ color: 'var(--success)' }}>{formatPrice(row.high)}</td>
                                                            <td style={{ color: 'var(--danger)' }}>{formatPrice(row.low)}</td>
                                                            <td style={{ fontWeight: '600' }}>{formatPrice(row.close)}</td>
                                                            <td className={change >= 0 ? 'positive' : 'negative'}>
                                                                {formatPercentage(change)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="table-hint">Showing last 20 candles</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* TECHNICAL TAB */}
                    {activeTab === 'technical' && (
                        <div className="technical-tab-content">
                            {loadingDetails ? (
                                <div className="loading-spinner">Loading technical data...</div>
                            ) : (
                                <>
                                    {/* Blockchain Info */}
                                    <div className="info-section">
                                        <h4 style={{
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            marginBottom: '1rem',
                                            color: 'var(--text-primary)',
                                            borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                            paddingBottom: '0.5rem'
                                        }}>Blockchain Information</h4>
                                        <div className="info-grid" style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                            gap: '1rem'
                                        }}>
                                            {details?.hashing_algorithm && (
                                                <div className="info-item" style={{
                                                    padding: '1rem',
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}>
                                                    <span className="info-label" style={{
                                                        display: 'block',
                                                        fontSize: '0.85rem',
                                                        color: 'var(--text-secondary)',
                                                        marginBottom: '0.5rem',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>Hashing Algorithm</span>
                                                    <span className="info-value" style={{
                                                        display: 'block',
                                                        fontSize: '1rem',
                                                        fontWeight: '600',
                                                        color: 'var(--text-primary)'
                                                    }}>{details.hashing_algorithm}</span>
                                                </div>
                                            )}
                                            {details?.block_time_in_minutes && (
                                                <div className="info-item" style={{
                                                    padding: '1rem',
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}>
                                                    <span className="info-label" style={{
                                                        display: 'block',
                                                        fontSize: '0.85rem',
                                                        color: 'var(--text-secondary)',
                                                        marginBottom: '0.5rem',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>Block Time</span>
                                                    <span className="info-value" style={{
                                                        display: 'block',
                                                        fontSize: '1rem',
                                                        fontWeight: '600',
                                                        color: 'var(--text-primary)'
                                                    }}>{details.block_time_in_minutes} minutes</span>
                                                </div>
                                            )}
                                            {details?.genesis_date && (
                                                <div className="info-item" style={{
                                                    padding: '1rem',
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}>
                                                    <span className="info-label" style={{
                                                        display: 'block',
                                                        fontSize: '0.85rem',
                                                        color: 'var(--text-secondary)',
                                                        marginBottom: '0.5rem',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>Genesis Date</span>
                                                    <span className="info-value" style={{
                                                        display: 'block',
                                                        fontSize: '1rem',
                                                        fontWeight: '600',
                                                        color: 'var(--text-primary)'
                                                    }}>{details.genesis_date}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Categories */}
                                    {details?.categories && details.categories.length > 0 && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Categories</h4>
                                            <div className="categories-list" style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '0.5rem'
                                            }}>
                                                {details.categories.map((cat, i) => (
                                                    <span key={i} className="category-badge" style={{
                                                        padding: '0.5rem 1rem',
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                                        borderRadius: '20px',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        color: '#60a5fa'
                                                    }}>{cat}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contract Addresses / Platforms */}
                                    {details?.platforms && Object.keys(details.platforms).length > 0 && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Contract Addresses</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {Object.entries(details.platforms).map(([chain, address]) => {
                                                    if (!address) return null;
                                                    return (
                                                        <div key={chain} className="contract-row" style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '1rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            gap: '1rem'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                                                <span className="chain-name" style={{
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: '600',
                                                                    color: 'var(--accent-primary)',
                                                                    textTransform: 'capitalize',
                                                                    minWidth: '80px'
                                                                }}>{chain || 'Native'}</span>
                                                                <span className="address" title={address} style={{
                                                                    fontSize: '0.9rem',
                                                                    color: 'var(--text-secondary)',
                                                                    fontFamily: 'monospace',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {address.length > 20
                                                                        ? `${address.substring(0, 10)}...${address.substring(address.length - 8)}`
                                                                        : address || 'Native Chain'
                                                                    }
                                                                </span>
                                                            </div>
                                                            <button
                                                                className="copy-btn"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(address);
                                                                    alert('Address copied to clipboard!');
                                                                }}
                                                                title="Copy address"
                                                                style={{
                                                                    padding: '0.5rem 1rem',
                                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                                    borderRadius: '6px',
                                                                    color: '#60a5fa',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: '500',
                                                                    transition: 'all 0.2s',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                                                                    e.target.style.transform = 'translateY(-1px)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                                                                    e.target.style.transform = 'translateY(0)';
                                                                }}
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sentiment */}
                                    {details?.sentiment_votes_up_percentage !== undefined && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Community Sentiment</h4>
                                            <div style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                padding: '1.5rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '0.75rem'
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        color: 'var(--success)'
                                                    }}>Positive: {details.sentiment_votes_up_percentage.toFixed(1)}%</span>
                                                    <span style={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        color: 'var(--danger)'
                                                    }}>Negative: {details.sentiment_votes_down_percentage.toFixed(1)}%</span>
                                                </div>
                                                <div className="sentiment-bar" style={{
                                                    display: 'flex',
                                                    width: '100%',
                                                    height: '12px',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    background: 'rgba(239, 68, 68, 0.3)'
                                                }}>
                                                    <div className="sentiment-positive" style={{
                                                        width: `${details.sentiment_votes_up_percentage}%`,
                                                        background: 'linear-gradient(90deg, var(--success), rgba(34, 197, 94, 0.8))',
                                                        transition: 'width 0.3s ease'
                                                    }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Watchlist */}
                                    {details?.watchlist_portfolio_users && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Community Interest</h4>
                                            <div className="info-item" style={{
                                                padding: '1.5rem',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                textAlign: 'center'
                                            }}>
                                                <span className="info-label" style={{
                                                    display: 'block',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-secondary)',
                                                    marginBottom: '0.5rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>Watchlist Users</span>
                                                <span className="info-value" style={{
                                                    display: 'block',
                                                    fontSize: '1.75rem',
                                                    fontWeight: '700',
                                                    color: 'var(--accent-primary)'
                                                }}>{formatNumber(details.watchlist_portfolio_users)}</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* INFO & LINKS TAB */}
                    {activeTab === 'info' && (
                        <div className="info-tab-content">
                            {loadingDetails ? (
                                <div className="loading-spinner">Loading links...</div>
                            ) : (
                                <>
                                    {/* Official Links */}
                                    <div className="info-section">
                                        <h4 style={{
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            marginBottom: '1rem',
                                            color: 'var(--text-primary)',
                                            borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                            paddingBottom: '0.5rem'
                                        }}>Official Resources</h4>
                                        <div className="links-grid" style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: '0.75rem'
                                        }}>
                                            {details?.links?.homepage?.filter(Boolean).map((url, i) => (
                                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'var(--text-primary)',
                                                        textDecoration: 'none',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}>
                                                    <span>Website {i > 0 ? i + 1 : ''}</span>
                                                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                </a>
                                            ))}
                                            {details?.links?.whitepaper && (
                                                <a href={details.links.whitepaper} target="_blank" rel="noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'var(--text-primary)',
                                                        textDecoration: 'none',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}>
                                                    <span>Whitepaper</span>
                                                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Blockchain Explorers */}
                                    {details?.links?.blockchain_site && details.links.blockchain_site.filter(Boolean).length > 0 && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Blockchain Explorers</h4>
                                            <div className="links-grid" style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                gap: '0.75rem'
                                            }}>
                                                {details.links.blockchain_site.filter(Boolean).slice(0, 6).map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.875rem 1rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '8px',
                                                            color: 'var(--text-primary)',
                                                            textDecoration: 'none',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}>
                                                        <span>Explorer {i + 1}</span>
                                                        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Forums */}
                                    {details?.links?.official_forum_url && details.links.official_forum_url.filter(Boolean).length > 0 && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Community Forums</h4>
                                            <div className="links-grid" style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                gap: '0.75rem'
                                            }}>
                                                {details.links.official_forum_url.filter(Boolean).map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.875rem 1rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '8px',
                                                            color: 'var(--text-primary)',
                                                            textDecoration: 'none',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}>
                                                        <span>Forum {i + 1}</span>
                                                        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Announcement Channels */}
                                    {details?.links?.announcement_url && details.links.announcement_url.filter(Boolean).length > 0 && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Announcements</h4>
                                            <div className="links-grid" style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                gap: '0.75rem'
                                            }}>
                                                {details.links.announcement_url.filter(Boolean).map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.875rem 1rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '8px',
                                                            color: 'var(--text-primary)',
                                                            textDecoration: 'none',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}>
                                                        <span>Announcements {i + 1}</span>
                                                        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Chat Channels */}
                                    {details?.links?.chat_url && details.links.chat_url.filter(Boolean).length > 0 && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Chat Channels</h4>
                                            <div className="links-grid" style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                gap: '0.75rem'
                                            }}>
                                                {details.links.chat_url.filter(Boolean).map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.875rem 1rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '8px',
                                                            color: 'var(--text-primary)',
                                                            textDecoration: 'none',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}>
                                                        <span>Chat {i + 1}</span>
                                                        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* COMMUNITY TAB */}
                    {activeTab === 'community' && (
                        <div className="community-tab-content">
                            {loadingDetails ? (
                                <div className="loading-spinner">Loading community data...</div>
                            ) : (
                                <>
                                    {/* Social Media Links */}
                                    <div className="info-section">
                                        <h4 style={{
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            marginBottom: '1rem',
                                            color: 'var(--text-primary)',
                                            borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                            paddingBottom: '0.5rem'
                                        }}>Social Media</h4>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: '0.75rem'
                                        }}>
                                            {details?.links?.twitter_screen_name && (
                                                <a
                                                    href={`https://twitter.com/${details.links.twitter_screen_name}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'var(--text-primary)',
                                                        textDecoration: 'none',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <span>X</span>
                                                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                </a>
                                            )}
                                            {details?.links?.facebook_username && (
                                                <a
                                                    href={`https://facebook.com/${details.links.facebook_username}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'var(--text-primary)',
                                                        textDecoration: 'none',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <span>Facebook</span>
                                                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                </a>
                                            )}
                                            {details?.links?.subreddit_url && (
                                                <a
                                                    href={details.links.subreddit_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'var(--text-primary)',
                                                        textDecoration: 'none',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <span>Reddit</span>
                                                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                </a>
                                            )}
                                            {details?.links?.telegram_channel_identifier && (
                                                <a
                                                    href={`https://t.me/${details.links.telegram_channel_identifier}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'var(--text-primary)',
                                                        textDecoration: 'none',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <span>Telegram</span>
                                                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Developer/Code Links */}
                                    {details?.links?.repos_url && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Source Code</h4>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                gap: '0.75rem'
                                            }}>
                                                {details.links.repos_url.github?.filter(Boolean).map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.875rem 1rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '8px',
                                                            color: 'var(--text-primary)',
                                                            textDecoration: 'none',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <span>GitHub {i > 0 ? i + 1 : ''}</span>
                                                        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                    </a>
                                                ))}
                                                {details.links.repos_url.bitbucket?.filter(Boolean).map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.875rem 1rem',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '8px',
                                                            color: 'var(--text-primary)',
                                                            textDecoration: 'none',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '1.1rem' }}>🪣</span>
                                                        <span>Bitbucket {i > 0 ? i + 1 : ''}</span>
                                                        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Community Statistics */}
                                    {details?.community_data && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Community Statistics</h4>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                gap: '0.75rem'
                                            }}>
                                                {details.community_data.facebook_likes !== null && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Facebook Likes
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.community_data.facebook_likes)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.community_data.reddit_subscribers > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Reddit Subscribers
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.community_data.reddit_subscribers)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.community_data.reddit_accounts_active_48h > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Reddit Active (48h)
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.community_data.reddit_accounts_active_48h)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.community_data.telegram_channel_user_count !== null && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Telegram Members
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.community_data.telegram_channel_user_count)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Developer Statistics */}
                                    {details?.developer_data && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Developer Activity</h4>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                gap: '0.75rem'
                                            }}>
                                                {details.developer_data.forks > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Forks
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.developer_data.forks)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.developer_data.stars > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Stars
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.developer_data.stars)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.developer_data.subscribers > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Watchers
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.developer_data.subscribers)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.developer_data.total_issues > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Total Issues
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.developer_data.total_issues)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.developer_data.closed_issues > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Closed Issues
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.developer_data.closed_issues)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.developer_data.pull_requests_merged > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Merged PRs
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.developer_data.pull_requests_merged)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.developer_data.pull_request_contributors > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Contributors
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.developer_data.pull_request_contributors)}
                                                        </div>
                                                    </div>
                                                )}
                                                {details.developer_data.commit_count_4_weeks > 0 && (
                                                    <div style={{
                                                        padding: '0.875rem 1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '8px'
                                                    }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                            Commits (4w)
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {formatNumber(details.developer_data.commit_count_4_weeks)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Code Changes (Last 4 Weeks) */}
                                    {details?.developer_data?.code_additions_deletions_4_weeks && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Code Changes (Last 4 Weeks)</h4>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.875rem 1rem',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                fontWeight: '500'
                                            }}>
                                                <span style={{ color: 'var(--success)' }}>
                                                    +{formatNumber(details.developer_data.code_additions_deletions_4_weeks.additions)} additions
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)' }}>|</span>
                                                <span style={{ color: 'var(--danger)' }}>
                                                    -{formatNumber(details.developer_data.code_additions_deletions_4_weeks.deletions)} deletions
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ABOUT TAB */}
                    {activeTab === 'about' && (
                        <div className="about-tab-content">
                            {loadingDetails ? (
                                <div className="loading-spinner">Loading description...</div>
                            ) : (
                                <>
                                    {/* Description */}
                                    {(() => {
                                        const rawDesc =
                                            typeof details?.description === 'string'
                                                ? details.description
                                                : details?.description?.en;

                                        const descText =
                                            rawDesc && rawDesc.trim()
                                                ? rawDesc
                                                : '<p>No description available for this asset.</p>';

                                        return (
                                            <div className="info-section">
                                                <h4
                                                    style={{
                                                        fontSize: '1.1rem',
                                                        fontWeight: '600',
                                                        marginBottom: '1rem',
                                                        color: 'var(--text-primary)',
                                                        borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                        paddingBottom: '0.5rem',
                                                    }}
                                                >
                                                    About {details?.name}
                                                </h4>

                                                <div
                                                    className="coin-description"
                                                    style={{
                                                        lineHeight: '1.7',
                                                        fontSize: '0.95rem',
                                                        color: 'var(--text-primary)',
                                                        padding: '1rem',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: descText }}
                                                />
                                            </div>
                                        );
                                    })()}


                                    {/* Additional Info */}
                                    <div className="info-section">
                                        <h4 style={{
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            marginBottom: '1rem',
                                            color: 'var(--text-primary)',
                                            borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                            paddingBottom: '0.5rem'
                                        }}>Additional Information</h4>
                                        <div style={{
                                            display: 'grid',
                                            gap: '0.75rem',
                                            padding: '1rem',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px'
                                        }}>
                                            {details?.id && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>CoinGecko ID:</span>
                                                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{details.id}</span>
                                                </div>
                                            )}
                                            {details?.symbol && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Symbol:</span>
                                                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{details.symbol.toUpperCase()}</span>
                                                </div>
                                            )}
                                            {details?.asset_platform_id && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Platform:</span>
                                                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{details.asset_platform_id}</span>
                                                </div>
                                            )}
                                            {details?.country_origin && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Country of Origin:</span>
                                                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{details.country_origin}</span>
                                                </div>
                                            )}
                                            {details?.last_updated && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Last Updated:</span>
                                                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                                        {new Date(details.last_updated).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Public Notices */}
                                    {details?.public_notice && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Public Notice</h4>
                                            <div style={{
                                                padding: '1rem',
                                                background: 'rgba(255, 193, 7, 0.1)',
                                                border: '1px solid rgba(255, 193, 7, 0.3)',
                                                borderRadius: '8px',
                                                color: '#ffc107'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                                    <strong>Warning</strong>
                                                </div>
                                                <p style={{ margin: 0, lineHeight: '1.6' }}>{details.public_notice}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Additional Notices */}
                                    {details?.additional_notices && details.additional_notices.length > 0 && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Additional Notices</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {details.additional_notices.map((notice, i) => (
                                                    <div key={i} style={{
                                                        padding: '1rem',
                                                        background: 'rgba(33, 150, 243, 0.1)',
                                                        border: '1px solid rgba(33, 150, 243, 0.3)',
                                                        borderRadius: '8px',
                                                        color: '#2196f3'
                                                    }}>
                                                        <p style={{ margin: 0, lineHeight: '1.6' }}>{notice}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Preview Listing */}
                                    {details?.preview_listing && (
                                        <div className="info-section">
                                            <h4 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                marginBottom: '1rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                                paddingBottom: '0.5rem'
                                            }}>Preview Listing</h4>
                                            <div style={{
                                                padding: '1rem',
                                                background: 'rgba(156, 39, 176, 0.1)',
                                                border: '1px solid rgba(156, 39, 176, 0.3)',
                                                borderRadius: '8px',
                                                color: '#9c27b0'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>🔍</span>
                                                    <strong>Preview Mode</strong>
                                                </div>
                                                <p style={{ margin: 0, lineHeight: '1.6' }}>This is a preview listing and may have limited data.</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with Last Updated */}
                <div className="modal-footer" style={{
                    padding: '1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                }}>
                    {details?.last_updated && (
                        <p>
                            Last updated: {new Date(details.last_updated).toLocaleString()} |
                            Data from <a href="https://www.coingecko.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', marginLeft: '5px' }}>CoinGecko</a>
                        </p>
                    )}
                </div>
            </div>
        </div >
    );
}