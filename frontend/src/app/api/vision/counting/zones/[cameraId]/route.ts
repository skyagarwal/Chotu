import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cameraId: string }> }
) {
  try {
    const { cameraId } = await params;
    const response = await fetch(`${IMAGE_AI_URL}/counting/zones/${cameraId}`);
    
    if (!response.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get zones error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cameraId: string }> }
) {
  try {
    const { cameraId } = await params;
    const body = await request.json();

    const response = await fetch(`${IMAGE_AI_URL}/counting/zones/${cameraId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Image AI responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Save zones error:', error);
    return NextResponse.json({ error: 'Failed to save zones' }, { status: 500 });
  }
}
