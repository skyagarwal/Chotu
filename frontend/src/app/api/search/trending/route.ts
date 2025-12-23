import { NextResponse } from 'next/server';

const SEARCH_API_URL = process.env.SEARCH_API_INTERNAL_URL || 'http://search-api:3100';

// GET /api/search/trending - Get trending queries
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const window = searchParams.get('window') || '7d';
  const module = searchParams.get('module') || '';
  const timeOfDay = searchParams.get('time_of_day') || '';

  try {
    let url = `${SEARCH_API_URL}/analytics/trending?window=${window}`;
    if (module) url += `&module=${module}`;
    if (timeOfDay) url += `&time_of_day=${timeOfDay}`;

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch trending:', response.status);
      return NextResponse.json({ success: false, rows: [] });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Trending fetch error:', error);
    return NextResponse.json({ success: false, rows: [] });
  }
}
