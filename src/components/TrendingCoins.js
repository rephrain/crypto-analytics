'use client';

import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
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
    LineController
} from 'chart.js';
import { formatPrice, formatNumber, formatPercentage } from '@/lib/dataService';
import CoinDetailModal from './CoinDetailModal';

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
    LineController
);

/**
 * TrendingCoins Component
 * Displays currently trending/hot cryptocurrencies
 * Clicking on a coin shows detailed modal with chart
 */
export default function TrendingCoins({ data, marketData, loading }) {
    const [selectedCoin, setSelectedCoin] = useState(null);

    // Handle data shape (support both old array and new object format)
    const coins = Array.isArray(data) ? data : (data?.coins || []);

    // Find full coin data from marketData by id
    const getFullCoinData = (trendingCoin) => {
        if (!marketData) return null;
        return marketData.find(coin => coin.id === trendingCoin.id);
    };

    const handleCoinClick = (trendingCoin) => {
        const fullData = getFullCoinData(trendingCoin);
        if (fullData) {
            setSelectedCoin(fullData);
        } else {
            // If not found in marketData, show limited modal with trending data
            setSelectedCoin({
                ...trendingCoin,
                image: trendingCoin.thumb,
                currentPrice: null,
                priceChange24h: null,
                limited: true
            });
        }
    };

    const closeModal = () => {
        setSelectedCoin(null);
    };

    if (loading) {
        return (
            <div className="trending-container">
                <h2 className="section-title">Trending Now</h2>
                <div className="trending-grid">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className="trending-card skeleton">
                            <div className="skeleton-circle"></div>
                            <div className="skeleton-text"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!coins || coins.length === 0) {
        return (
            <div className="trending-container">
                <h2 className="section-title">Trending Now</h2>
                <div className="error-message">No trending data available</div>
            </div>
        );
    }

    return (
        <>
            <div className="trending-container">
                <div className="trending-header">
                    <h2 className="section-title">Trending Now</h2>
                    <span className="trending-count">{coins.length} coins</span>
                </div>

                <div className="trending-grid scrollable">
                    {coins.map((coin) => (
                        <div
                            key={coin.id}
                            className="trending-card clickable"
                            onClick={() => handleCoinClick(coin)}
                        >
                            <div className="trending-rank">#{coin.rank}</div>
                            <img src={coin.thumb} alt={coin.name} className="trending-icon" />
                            <div className="trending-info">
                                <span className="trending-name">{coin.name}</span>
                                <span className="trending-symbol">{coin.symbol}</span>
                            </div>
                            {coin.marketCapRank && (
                                <div className="trending-mcap">
                                    <span className="mcap-label">MCap Rank</span>
                                    <span className="mcap-value">#{coin.marketCapRank}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Coin Detail Modal */}
            {selectedCoin && (
                <CoinDetailModal coin={selectedCoin} onClose={closeModal} />
            )}
        </>
    );
}


