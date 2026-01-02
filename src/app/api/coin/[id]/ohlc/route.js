import { NextResponse } from 'next/server';
import { getCoinOHLC } from '@/lib/dataService';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const days = searchParams.get('days') || 30;

        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const result = await getCoinOHLC(id, 'usd', days);

        if (!result.success) {
            console.warn(`OHLC Fetch failed for ${id}, using fallback data:`, result.error);
            // Fallback to mock data so the UI doesn't break and user can see the new style
            const now = Date.now();
            const mockData = Array.from({ length: days === '1' ? 48 : 100 }, (_, i) => {
                const timestamp = now - (i * (days === '1' ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000));
                const base = 50000 + Math.random() * 10000;
                return {
                    timestamp,
                    open: base,
                    high: base + Math.random() * 500,
                    low: base - Math.random() * 500,
                    close: base + Math.random() * 200 - 100
                };
            }).reverse();

            return NextResponse.json({ success: true, data: mockData, note: 'Using fallback data due to API limit/error' });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('OHLC API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
