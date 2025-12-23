import { NextRequest, NextResponse } from 'next/server';

const VISION_API_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({ storeId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(
      `${VISION_API_URL}/counting/analytics/stats?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counting stats' },
      { status: 500 }
    );
  }
}
