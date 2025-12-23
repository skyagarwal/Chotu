import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3200';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/audit-logs/stats`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log stats' },
      { status: 500 }
    );
  }
}
