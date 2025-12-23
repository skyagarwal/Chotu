import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_URL || 'http://localhost:3000';

/**
 * POST /api/vision/multimodal/analyze - Analyze image with custom prompt
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const response = await fetch(`${IMAGE_AI_URL}/multimodal/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to analyze image', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Multimodal analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}
