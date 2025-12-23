import { NextRequest, NextResponse } from 'next/server';

const NERVE_URL = process.env.NERVE_URL || 'http://192.168.0.151:7100';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${NERVE_URL}/api/nerve/rider-assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error initiating rider call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate rider call' },
      { status: 500 }
    );
  }
}
