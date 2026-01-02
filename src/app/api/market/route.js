import { NextResponse } from 'next/server';
import { getMarketData, getCoinsMarkets } from '@/lib/dataService';

/**
 * Market Data API Route
 * 
 * GET /api/market
 * Returns top cryptocurrencies with real-time market data
 * 
 * Query Parameters:
 * - limit: Number of coins to fetch (default: 250, max: 250)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit')) || 250, 1444);
        const category = searchParams.get('category');

        let result;
        if (category) {
            // Fetch coins for specific category
            result = await getCoinsMarkets({
                category,
                perPage: limit, // Use limit as perPage for category
                page: 1,
                sparkline: true,
                priceChangePercentage: '1h,24h,7d'
            });
        } else {
            // Fetch general market data (existing logic)
            result = await getMarketData(limit);
        }

        return NextResponse.json(result, {
            status: result.success ? 200 : 500,
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
            }
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                data: [],
                meta: { timestamp: new Date().toISOString() }
            },
            { status: 500 }
        );
    }
}
