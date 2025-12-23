import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_URL || 'http://localhost:3000';

/**
 * GET /api/vision/ab-testing/experiments/[id] - Get experiment by ID
 * PUT /api/vision/ab-testing/experiments/[id] - Update experiment
 * DELETE /api/vision/ab-testing/experiments/[id] - Delete experiment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${IMAGE_AI_URL}/api/v1/ab-testing/experiments/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch experiment', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('A/B testing experiment error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const response = await fetch(`${IMAGE_AI_URL}/api/v1/ab-testing/experiments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to update experiment', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('A/B testing update error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${IMAGE_AI_URL}/api/v1/ab-testing/experiments/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to delete experiment', details: error },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('A/B testing delete error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}
