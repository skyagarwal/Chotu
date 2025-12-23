import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

// GET all voice characters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive');
    
    const url = includeInactive 
      ? `${BACKEND_URL}/api/voice-characters?includeInactive=${includeInactive}`
      : `${BACKEND_URL}/api/voice-characters`;
    
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Voice characters API error:', error);
    return NextResponse.json({ error: 'Failed to fetch voice characters' }, { status: 500 });
  }
}

// POST create new character
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/voice-characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Voice characters create error:', error);
    return NextResponse.json({ error: 'Failed to create voice character' }, { status: 500 });
  }
}
