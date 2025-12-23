import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/voice-characters/seed`, {
      method: 'POST',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Voice seed error:', error);
    return NextResponse.json({ error: 'Failed to seed voice characters' }, { status: 500 });
  }
}
