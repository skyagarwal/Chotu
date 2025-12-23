import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    const url = storeId 
      ? `${IMAGE_AI_URL}/counting/alerts/active?storeId=${storeId}`
      : `${IMAGE_AI_URL}/counting/alerts/active`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Image AI responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Active alerts error:', error);
    return NextResponse.json({ alerts: [], count: 0 }, { status: 200 });
  }
}
