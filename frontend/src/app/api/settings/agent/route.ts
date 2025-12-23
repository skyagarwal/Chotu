import { NextRequest, NextResponse } from 'next/server';

// Backend URL
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

// Default agent settings
const DEFAULT_SETTINGS = {
  tone: {
    personality: 'friendly',
    enthusiasm: 70,
    empathy: 80,
    humor: 40,
    formality: 50,
    verbosity: 'balanced',
    emoji: true,
    greetingStyle: 'warm',
  },
  language: {
    defaultLanguage: 'hi',
    supportedLanguages: ['en', 'hi', 'mr'],
    autoDetect: true,
    translationEnabled: true,
    regionalVariants: true,
  },
  response: {
    maxLength: 500,
    includeEmoji: true,
    useMarkdown: false,
    suggestFollowUps: true,
    acknowledgeFirst: true,
    useUserName: true,
  },
  voice: {
    ttsVoice: 'default',
    speechRate: 1.0,
    pitch: 1.0,
    emphasis: 'medium',
  },
};

// In-memory settings (in production, store in database)
let currentSettings = { ...DEFAULT_SETTINGS };

export async function GET() {
  try {
    // Try to fetch from backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/agent`, {
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend not available, use local settings
    }

    return NextResponse.json(currentSettings);
  } catch (error) {
    console.error('Failed to get agent settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate and merge settings
    currentSettings = {
      tone: { ...DEFAULT_SETTINGS.tone, ...body.tone },
      language: { ...DEFAULT_SETTINGS.language, ...body.language },
      response: { ...DEFAULT_SETTINGS.response, ...body.response },
      voice: { ...DEFAULT_SETTINGS.voice, ...body.voice },
    };

    // Try to save to backend
    try {
      await fetch(`${BACKEND_URL}/api/settings/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSettings),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Backend not available, settings saved locally
      console.log('Backend not available, settings saved locally');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Agent settings saved successfully',
      settings: currentSettings,
    });
  } catch (error) {
    console.error('Failed to save agent settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
