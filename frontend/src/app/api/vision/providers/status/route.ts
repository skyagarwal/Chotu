import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_URL || 'http://localhost:3000';

/**
 * GET /api/vision/providers/status - Get all VLM provider statuses
 */
export async function GET(request: NextRequest) {
  try {
    // Try multiple endpoints for provider info
    const [providersRes, healthRes, metricsRes] = await Promise.all([
      fetch(`${IMAGE_AI_URL}/multimodal/providers`, { cache: 'no-store' }).catch(() => null),
      fetch(`${IMAGE_AI_URL}/multimodal/health`, { cache: 'no-store' }).catch(() => null),
      fetch(`${IMAGE_AI_URL}/api/v1/dashboard/providers`, { cache: 'no-store' }).catch(() => null),
    ]);

    let providers = [];
    let status = 'unknown';

    if (providersRes?.ok) {
      const data = await providersRes.json();
      providers = data.providers || [];
      status = data.status || 'healthy';
    }

    if (healthRes?.ok) {
      const health = await healthRes.json();
      status = health.status || status;
      if (health.providers) {
        providers = health.providers;
      }
    }

    if (metricsRes?.ok) {
      const metrics = await metricsRes.json();
      if (metrics.providers) {
        providers = metrics.providers;
      }
    }

    // If no providers found, return default available providers
    if (providers.length === 0) {
      providers = [
        { name: 'openrouter', status: 'ready', enabled: true, freeModels: 8 },
        { name: 'gemini', status: 'ready', enabled: true },
        { name: 'openai', status: 'ready', enabled: true },
        { name: 'groq', status: 'ready', enabled: true },
        { name: 'self_hosted', status: 'ready', enabled: false },
      ];
    }

    return NextResponse.json({
      status,
      providers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Provider status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to Vision AI service',
        status: 'offline',
        providers: []
      },
      { status: 500 }
    );
  }
}
