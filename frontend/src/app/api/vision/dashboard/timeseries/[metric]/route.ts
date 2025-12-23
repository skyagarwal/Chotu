import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_URL || 'http://localhost:3000';

/**
 * GET /api/vision/dashboard/timeseries/[metric] - Get time series data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ metric: string }> }
) {
  try {
    const { metric } = await params;
    const { searchParams } = new URL(request.url);
    const hours = searchParams.get('hours') || '24';

    const response = await fetch(
      `${IMAGE_AI_URL}/api/v1/dashboard/timeseries/${metric}?hours=${hours}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch timeseries data', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vision timeseries error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}
