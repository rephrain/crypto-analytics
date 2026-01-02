import { NextResponse } from 'next/server';
import { getCoinDetails } from '@/lib/dataService';

/**
 * Coin Details API Route
 * 
 * GET /api/coin/[id]
 * Returns comprehensive details for a specific coin
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Coin ID is required' },
                { status: 400 }
            );
        }

        const serviceResponse = await getCoinDetails(id);

        if (!serviceResponse.success) {
            return NextResponse.json(
                { success: false, error: serviceResponse.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: serviceResponse.data,
            meta: { timestamp: new Date().toISOString() }
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch coin details',
                data: null
            },
            { status: 500 }
        );
    }
}
