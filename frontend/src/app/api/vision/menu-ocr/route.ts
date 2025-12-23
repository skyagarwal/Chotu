import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const format = request.nextUrl.searchParams.get('format') || 'json';

    // Forward the request to the Image AI backend
    const response = await fetch(`${IMAGE_AI_URL}/image-ai/menu-ocr?format=${format}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image AI error:', errorText);
      return NextResponse.json(
        { success: false, message: `Menu OCR failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    // For CSV/Excel, return as blob
    if (format === 'csv' || format === 'excel') {
      const blob = await response.blob();
      const headers = new Headers();
      headers.set('Content-Type', response.headers.get('Content-Type') || 'text/csv');
      headers.set('Content-Disposition', response.headers.get('Content-Disposition') || 'attachment');
      return new NextResponse(blob, { headers });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Menu OCR API proxy error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
