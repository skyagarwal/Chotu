import { NextRequest, NextResponse } from 'next/server';

const VISION_API_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Forward request to backend
    const response = await fetch(`${VISION_API_URL}/counting/objects`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Counting error:', error);
    return NextResponse.json(
      { error: 'Failed to count objects' },
      { status: 500 }
    );
  }
}
