import { NextResponse } from 'next/server';
import { getCoinTickers } from '@/lib/dataService';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const result = await getCoinTickers(id);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        // Limit to top 20 tickers to save bandwidth
        const topTickers = result.data.tickers.slice(0, 20);

        return NextResponse.json({
            success: true,
            data: topTickers,
            meta: { timestamp: new Date().toISOString() }
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
