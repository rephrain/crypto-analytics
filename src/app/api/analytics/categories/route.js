import { NextResponse } from 'next/server';
import { getCoinCategories } from '@/lib/dataService';

export async function GET() {
    try {
        const result = await getCoinCategories('market_cap_desc');

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        // Return top 12 categories
        const topCategories = result.data.slice(0, 12);

        return NextResponse.json({
            success: true,
            data: topCategories,
            meta: result.meta
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
