'use client';

import { useState, useEffect } from 'react';
import { formatPercentage, formatPrice } from '@/lib/dataService';
import CoinDetailModal from './CoinDetailModal';

export default function MarketAnalysis() {
    const [gainersLosers, setGainersLosers] = useState({ gainers: [], losers: [] });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Interactive State
    const [selectedCoin, setSelectedCoin] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [categoryCoins, setCategoryCoins] = useState({});
    const [loadingCategory, setLoadingCategory] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [glRes, catRes] = await Promise.all([
                    fetch('/api/analytics/gainers-losers'),
                    fetch('/api/analytics/categories')
                ]);

                const glData = await glRes.json();
                const catData = await catRes.json();

                if (glData.success) setGainersLosers(glData.data);
                if (catData.success) setCategories(catData.data);
            } catch (error) {
                console.error("Failed to fetch analysis data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleCategoryClick = async (categoryId) => {
        if (expandedCategory === categoryId) {
            setExpandedCategory(null);
            return;
        }

        setExpandedCategory(categoryId);

        // If we haven't fetched coins for this category yet
        if (!categoryCoins[categoryId]) {
            setLoadingCategory(true);
            try {
                const res = await fetch(`/api/market?limit=10&category=${categoryId}`);
                const json = await res.json();
                if (json.success) {
                    setCategoryCoins(prev => ({
                        ...prev,
                        [categoryId]: json.data
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch category coins", error);
            } finally {
                setLoadingCategory(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="analysis-section skeleton-loading">
                <div className="analysis-card skeleton"></div>
                <div className="analysis-card skeleton"></div>
                <div className="analysis-card skeleton"></div>
            </div>
        );
    }

    return (
        <div className="analysis-section">
            {/* Top Gainers */}
            <div className="analysis-card gainers">
                <h3>Top Gainers (24h)</h3>
                <div className="coin-list">
                    {gainersLosers.gainers.slice(0, 5).map(coin => (
                        <div
                            key={coin.id}
                            className="coin-row clickable"
                            onClick={() => setSelectedCoin(coin)}
                        >
                            <div className="coin-left">
                                <img src={coin.image} alt={coin.name} width={24} height={24} />
                                <span className="name">{coin.symbol.toUpperCase()}</span>
                            </div>
                            <div className="coin-right">
                                <span className="price">{formatPrice(coin.currentPrice)}</span>
                                <span className="change positive">
                                    {formatPercentage(coin.priceChange24h)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Losers */}
            <div className="analysis-card losers">
                <h3>Top Losers (24h)</h3>
                <div className="coin-list">
                    {gainersLosers.losers.slice(0, 5).map(coin => (
                        <div
                            key={coin.id}
                            className="coin-row clickable"
                            onClick={() => setSelectedCoin(coin)}
                        >
                            <div className="coin-left">
                                <img src={coin.image} alt={coin.name} width={24} height={24} />
                                <span className="name">{coin.symbol.toUpperCase()}</span>
                            </div>
                            <div className="coin-right">
                                <span className="price">{formatPrice(coin.currentPrice)}</span>
                                <span className="change negative">
                                    {formatPercentage(coin.priceChange24h)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Categories */}
            <div className="analysis-card categories">
                <h3>Top Categories (24h)</h3>
                <div className="coin-list">
                    {categories.slice(0, 5).map(cat => (
                        <div key={cat.id} className="category-container">
                            <div
                                className={`coin-row clickable ${expandedCategory === cat.id ? 'active' : ''}`}
                                onClick={() => handleCategoryClick(cat.id)}
                            >
                                <div className="coin-left">
                                    <span className="name" style={{ fontSize: '0.9rem', width: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                                    {!expandedCategory && (
                                        <div className="category-coins" style={{ display: 'flex', marginLeft: '8px' }}>
                                            {cat.top_3_coins?.map((img, i) => (
                                                <img key={i} src={img} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', marginLeft: i > 0 ? '-6px' : '0', border: '1px solid var(--bg-card)' }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="coin-right">
                                    <span className={`change ${cat.market_cap_change_24h >= 0 ? 'positive' : 'negative'}`}>
                                        {formatPercentage(cat.market_cap_change_24h)}
                                    </span>
                                    <span className="arrow" style={{ marginLeft: '8px', fontSize: '0.8rem', opacity: 0.7 }}>
                                        {expandedCategory === cat.id ? '▲' : '▼'}
                                    </span>
                                </div>
                            </div>

                            {/* Expanded Category Content */}
                            {expandedCategory === cat.id && (
                                <div className="category-expanded">
                                    {loadingCategory && !categoryCoins[cat.id] ? (
                                        <div className="loading-spinner small">Loading coins...</div>
                                    ) : (
                                        <div className="category-coin-list">
                                            {(categoryCoins[cat.id] || []).map(coin => (
                                                <div
                                                    key={coin.id}
                                                    className="expanded-coin-row clickable"
                                                    onClick={() => setSelectedCoin(coin)}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className="rank" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', minWidth: '20px' }}>{coin.market_cap_rank || coin.marketCapRank}</span>
                                                        <img src={coin.image} alt={coin.symbol} width={20} height={20} style={{ borderRadius: '50%' }} />
                                                        <span className="symbol" style={{ fontWeight: '600', fontSize: '0.9rem' }}>{coin.symbol.toUpperCase()}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div className="price" style={{ fontSize: '0.9rem' }}>{formatPrice(coin.current_price || coin.currentPrice)}</div>
                                                        <div className={`change ${(coin.price_change_percentage_24h || coin.priceChange24h) >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.75rem' }}>
                                                            {formatPercentage(coin.price_change_percentage_24h || coin.priceChange24h)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {selectedCoin && (
                <CoinDetailModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
            )}
        </div>
    );
}
