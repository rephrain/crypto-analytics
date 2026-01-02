import { NextResponse } from 'next/server';
import { getTrendingData } from '@/lib/dataService';

/**
 * Trending Coins API Route
 * 
 * GET /api/trending
 * Returns currently trending cryptocurrencies
 */
export async function GET() {
    try {
        const result = await getTrendingData();

        return NextResponse.json(result, {
            status: result.success ? 200 : 500,
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
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
