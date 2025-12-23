import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ styleId: string }> }
) {
  try {
    const { styleId } = await params;
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/voice-characters/styles/${styleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Voice style PUT error:', error);
    return NextResponse.json({ error: 'Failed to update style' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ styleId: string }> }
) {
  try {
    const { styleId } = await params;
    const response = await fetch(`${BACKEND_URL}/api/voice-characters/styles/${styleId}`, {
      method: 'DELETE',
    });
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Voice style DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete style' }, { status: 500 });
  }
}
