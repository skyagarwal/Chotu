import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'default';

    const response = await fetch(`${IMAGE_AI_URL}/counting/live/dashboard?storeId=${storeId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Image AI responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Live dashboard error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch live dashboard',
        summary: {
          activeStreams: 0,
          totalOnlineCameras: 0,
          totalPeopleNow: 0,
          totalObjectsNow: 0,
        },
        cameras: [],
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
