import { NextResponse } from 'next/server';
import { getGainersLosers } from '@/lib/dataService';

export async function GET() {
    try {
        const result = await getGainersLosers();

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
