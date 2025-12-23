import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_URL || 'http://localhost:3000';

/**
 * GET /api/vision/settings - Get Vision AI settings
 * PUT /api/vision/settings - Update settings
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${IMAGE_AI_URL}/api/v1/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Return default settings if endpoint not available
      return NextResponse.json({
        defaultProvider: 'openrouter',
        enabledProviders: ['openrouter', 'gemini', 'openai'],
        fallbackEnabled: true,
        cacheEnabled: true,
        cacheTtlSeconds: 3600,
        maxRetries: 3,
        timeoutMs: 30000,
        costOptimization: true,
        preferFreeModels: true,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vision settings error:', error);
    return NextResponse.json({
      defaultProvider: 'openrouter',
      enabledProviders: ['openrouter', 'gemini', 'openai'],
      fallbackEnabled: true,
      cacheEnabled: true,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${IMAGE_AI_URL}/api/v1/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to update settings', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vision settings update error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Vision AI service' },
      { status: 500 }
    );
  }
}
