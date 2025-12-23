import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_URL || 'http://localhost:3000';

/**
 * GET /api/vision/ab-testing/experiments - Get all experiments
 * POST /api/vision/ab-testing/experiments - Create new experiment
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${IMAGE_AI_URL}/api/v1/ab-testing/experiments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch experiments', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('A/B testing experiments error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${IMAGE_AI_URL}/api/v1/ab-testing/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to create experiment', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('A/B testing create error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}
