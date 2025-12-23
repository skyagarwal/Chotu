import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';
const EXOTEL_URL = process.env.EXOTEL_SERVICE_URL || 'http://192.168.0.151:3100';
const VOICE_AGENT_URL = process.env.VOICE_AGENT_URL || 'http://192.168.0.151:8091';

const WHATSAPP_CAPABILITIES = [
  'Text Messages',
  'Interactive Buttons (3 max)',
  'Interactive Lists (10 sections)',
  'CTA URL Buttons',
  'Location Sharing',
  'Location Request',
  'Image Messages',
  'Video Messages',
  'Audio Messages',
  'Document Messages',
  'Contact Cards',
  'Templates',
  'Reactions',
  'Read Receipts',
  'Typing Indicators',
  'WhatsApp Flows',
];

const EXOTEL_CAPABILITIES = [
  'IVR Voice Flows',
  'Click-to-Call',
  'Number Masking (ExoBridge)',
  'Voice Streaming (AgentStream)',
  'Verified Calls (Truecaller)',
  'SMS Messaging',
  'WhatsApp Business API',
  'Auto Dialer (PACE)',
  'Call Recording',
  'Conversation Quality Analysis',
  'Voice Ordering',
  'Jupiter Integration',
];

const VOICE_AI_CAPABILITIES = [
  'ASR (Whisper large-v3)',
  'TTS (Orpheus 8 voices)',
  'Real-time Streaming',
  'WebSocket Support',
  'Voice Enhancement',
  'Emotion Tags',
  'Multi-language Support',
  'Jupiter AI Integration',
];

export async function GET() {
  try {
    // Try to get channel status from backend
    const healthResponse = await fetch(`${BACKEND_URL}/health`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const healthData = healthResponse.ok ? await healthResponse.json() : null;
    
    // Try Exotel service health
    let exotelData = null;
    try {
      const exotelResponse = await fetch(`${EXOTEL_URL}/health`, {
        headers: { 'Content-Type': 'application/json' },
      });
      exotelData = exotelResponse.ok ? await exotelResponse.json() : null;
    } catch (e) {
      console.log('Exotel service not reachable');
    }
    
    // Try Voice Agent health
    let voiceData = null;
    try {
      const voiceResponse = await fetch(`${VOICE_AGENT_URL}/health`, {
        headers: { 'Content-Type': 'application/json' },
      });
      voiceData = voiceResponse.ok ? await voiceResponse.json() : null;
    } catch (e) {
      console.log('Voice Agent not reachable');
    }
    
    // Return channel configurations
    const channels = [
      {
        id: 'whatsapp-main',
        name: 'WhatsApp Business',
        platform: 'whatsapp',
        status: healthData?.status === 'ok' ? 'active' : 'inactive',
        lastActivity: new Date(),
        messagesTotal: 15234,
        messagesToday: 127,
        config: {
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '908689285655004',
          wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '1538156784195596',
          businessName: 'Mangwale',
          businessPhone: '+91 97301 99571',
          apiVersion: 'v22.0',
          webhookUrl: 'https://api.mangwale.ai/api/webhook/whatsapp',
        },
        capabilities: WHATSAPP_CAPABILITIES,
      },
      {
        id: 'exotel-voice',
        name: 'Exotel Voice',
        platform: 'voice',
        status: exotelData?.status === 'ok' ? 'active' : 'inactive',
        lastActivity: new Date(),
        callsTotal: exotelData?.recordings?.total || 0,
        callsToday: 0,
        config: {
          serviceUrl: EXOTEL_URL,
          version: exotelData?.version || 'unknown',
          jupiterConnected: exotelData?.connections?.jupiter?.connected || false,
          phpConnected: exotelData?.connections?.php?.connected || false,
          features: exotelData?.features || [],
        },
        capabilities: EXOTEL_CAPABILITIES,
      },
      {
        id: 'voice-ai',
        name: 'Voice AI Agent',
        platform: 'voice-ai',
        status: voiceData?.status === 'ok' || voiceData?.status === 'healthy' ? 'active' : 'inactive',
        lastActivity: new Date(),
        sessionsActive: 0,
        config: {
          serviceUrl: VOICE_AGENT_URL,
          version: voiceData?.version || 'unknown',
          jupiterConnected: voiceData?.backends?.jupiter?.status === 'ok' || false,
          asrProvider: voiceData?.services?.asr?.provider || 'Faster-Whisper',
          ttsProvider: voiceData?.services?.tts?.provider || 'Orpheus',
        },
        capabilities: VOICE_AI_CAPABILITIES,
      },
      {
        id: 'telegram-main',
        name: 'Telegram Bot',
        platform: 'telegram',
        status: 'inactive',
        config: {
          botUsername: '@MangwaleBot',
          webhookUrl: 'https://api.mangwale.ai/api/webhook/telegram',
        },
        capabilities: [
          'Text Messages',
          'Inline Keyboards',
          'Reply Keyboards',
          'Images & Media',
          'Location Sharing',
          'Contact Cards',
          'Polls',
        ],
      },
      {
        id: 'web-chat',
        name: 'Web Chat',
        platform: 'web',
        status: healthData?.status === 'ok' ? 'active' : 'inactive',
        lastActivity: new Date(),
        messagesTotal: 8921,
        messagesToday: 89,
        config: {
          widgetUrl: 'https://chat.mangwale.ai',
          wsEndpoint: 'wss://api.mangwale.ai/socket',
        },
        capabilities: [
          'Text Messages',
          'Interactive Buttons',
          'Product Cards',
          'Image Upload',
          'Location Sharing',
          'Voice Messages',
          'Real-time Updates',
        ],
      },
    ];

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ channels: [] }, { status: 500 });
  }
}
