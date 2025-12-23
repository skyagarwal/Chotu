import { NextRequest, NextResponse } from 'next/server';

const VISION_API_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function GET() {
  try {
    const response = await fetch(`${VISION_API_URL}/counting/classes`);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch classes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supported classes' },
      { status: 500 }
    );
  }
}
