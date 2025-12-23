import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_URL || 'http://localhost:3000';

/**
 * GET /api/vision/dashboard/alerts - Get active alerts
 * POST /api/vision/dashboard/alerts/:id/acknowledge - Acknowledge an alert
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${IMAGE_AI_URL}/api/v1/dashboard/alerts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch alerts', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vision alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}
