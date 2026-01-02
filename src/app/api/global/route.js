import { NextResponse } from 'next/server';
import { getGlobalData } from '@/lib/dataService';

/**
 * Global Market Data API Route
 * 
 * GET /api/global
 * Returns global cryptocurrency market statistics
 */
export async function GET() {
    try {
        const result = await getGlobalData();

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
                data: null,
                meta: { timestamp: new Date().toISOString() }
            },
            { status: 500 }
        );
    }
}
