'use client';

import { formatPrice, formatNumber, formatPercentage } from '@/lib/dataService';
import { useState, useMemo } from 'react';
import CoinDetailModal from './CoinDetailModal';
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
 * CryptoTable Component
 * Displays a sortable, paginated table of cryptocurrencies with key metrics
 * Clicking on a row opens a detail modal with the coin's chart
 */
export default function CryptoTable({ data, loading }) {
    const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedCoin, setSelectedCoin] = useState(null);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '';
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    // Filter data based on search
    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(coin =>
            coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    // Sort data
    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [filteredData, sortConfig]);

    // Pagination calculations
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = sortedData.slice(startIndex, endIndex);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handleRowClick = (coin) => {
        setSelectedCoin(coin);
    };

    const closeModal = () => {
        setSelectedCoin(null);
    };

    if (loading) {
        return (
            <div className="crypto-table-container">
                <h2 className="section-title">Cryptocurrencies</h2>
                <div className="table-skeleton">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton-row">
                            <div className="skeleton-cell"></div>
                            <div className="skeleton-cell wide"></div>
                            <div className="skeleton-cell"></div>
                            <div className="skeleton-cell"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="crypto-table-container">
                <h2 className="section-title">Top Cryptocurrencies</h2>
                <div className="error-message">No data available</div>
            </div>
        );
    }

    return (
        <>
            <div className="crypto-table-container">
                <div className="table-header">
                    <h2 className="section-title">Top {data.length} Cryptocurrencies</h2>
                    <div className="table-controls">
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search coins..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="search-input"
                            />
                        </div>
                        <div className="rows-per-page">
                            <label>Show:</label>
                            <select value={rowsPerPage} onChange={handleRowsPerPageChange} className="rows-select">
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

                <p className="table-hint">Click on any coin to view detailed chart</p>

                <div className="table-wrapper">
                    <table className="crypto-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('rank')} className="sortable">
                                    #{getSortIndicator('rank')}
                                </th>
                                <th onClick={() => handleSort('name')} className="sortable">
                                    Coin{getSortIndicator('name')}
                                </th>
                                <th onClick={() => handleSort('currentPrice')} className="sortable text-right">
                                    Price{getSortIndicator('currentPrice')}
                                </th>
                                <th onClick={() => handleSort('priceChange1h')} className="sortable text-right">
                                    1h %{getSortIndicator('priceChange1h')}
                                </th>
                                <th onClick={() => handleSort('priceChange24h')} className="sortable text-right">
                                    24h %{getSortIndicator('priceChange24h')}
                                </th>
                                <th onClick={() => handleSort('priceChange7d')} className="sortable text-right">
                                    7d %{getSortIndicator('priceChange7d')}
                                </th>
                                <th onClick={() => handleSort('marketCap')} className="sortable text-right">
                                    Market Cap{getSortIndicator('marketCap')}
                                </th>
                                <th onClick={() => handleSort('volume24h')} className="sortable text-right">
                                    Volume (24h){getSortIndicator('volume24h')}
                                </th>
                                <th className="text-center">7D Chart</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map(coin => (
                                <tr
                                    key={coin.id}
                                    onClick={() => handleRowClick(coin)}
                                    className="clickable-row"
                                >
                                    <td className="rank">{coin.rank}</td>
                                    <td className="coin-info">
                                        <img src={coin.image} alt={coin.name} className="coin-icon" />
                                        <div className="coin-details">
                                            <span className="coin-name">{coin.name}</span>
                                            <span className="coin-symbol">{coin.symbol}</span>
                                        </div>
                                    </td>
                                    <td className="text-right price">{formatPrice(coin.currentPrice)}</td>
                                    <td className={`text-right ${coin.priceChange1h >= 0 ? 'positive' : 'negative'}`}>
                                        {formatPercentage(coin.priceChange1h)}
                                    </td>
                                    <td className={`text-right ${coin.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                                        {formatPercentage(coin.priceChange24h)}
                                    </td>
                                    <td className={`text-right ${coin.priceChange7d >= 0 ? 'positive' : 'negative'}`}>
                                        {formatPercentage(coin.priceChange7d)}
                                    </td>
                                    <td className="text-right">${formatNumber(coin.marketCap)}</td>
                                    <td className="text-right">${formatNumber(coin.volume24h)}</td>
                                    <td className="sparkline-cell">
                                        <MiniSparkline data={coin.sparkline} positive={coin.priceChange7d >= 0} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="pagination">
                    <div className="pagination-info">
                        Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length} coins
                        {searchTerm && ` (filtered from ${data.length})`}
                    </div>
                    <div className="pagination-controls">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                            title="First page"
                        >
                            ««
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                        >
                            ‹ Prev
                        </button>

                        <div className="page-numbers">
                            {generatePageNumbers(currentPage, totalPages).map((page, index) => (
                                page === '...' ? (
                                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`pagination-btn page-num ${currentPage === page ? 'active' : ''}`}
                                    >
                                        {page}
                                    </button>
                                )
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                        >
                            Next ›
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                            title="Last page"
                        >
                            »»
                        </button>
                    </div>
                </div>
            </div>

            {/* Coin Detail Modal */}
            {selectedCoin && (
                <CoinDetailModal coin={selectedCoin} onClose={closeModal} />
            )}
        </>
    );
}

/**
 * Generate page numbers array with ellipsis for large page counts
 */
function generatePageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [];

    if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
    } else if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
    }

    return pages;
}

/**
 * MiniSparkline Component
 * Renders a small SVG sparkline chart
 */
function MiniSparkline({ data, positive }) {
    if (!data || data.length === 0) return <span className="no-data">—</span>;

    const width = 100;
    const height = 32;
    const padding = 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((value - min) / range) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="sparkline">
            <polyline
                points={points}
                fill="none"
                stroke={positive ? 'var(--success)' : 'var(--danger)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
