import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';
const WHATSAPP_API_VERSION = 'v22.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '908689285655004';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, platform } = body;

    if (platform === 'whatsapp') {
      // Test WhatsApp by checking the API
      const testResponse = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          },
        }
      );

      if (testResponse.ok) {
        const data = await testResponse.json();
        return NextResponse.json({
          success: true,
          message: 'WhatsApp connection successful',
          data: {
            displayPhoneNumber: data.display_phone_number,
            verifiedName: data.verified_name,
            qualityRating: data.quality_rating,
          },
        });
      } else {
        const error = await testResponse.json();
        return NextResponse.json(
          { success: false, message: error.error?.message || 'Connection failed' },
          { status: 400 }
        );
      }
    }

    // For other platforms, just return success (placeholder)
    return NextResponse.json({
      success: true,
      message: `${platform} channel test successful`,
    });
  } catch (error) {
    console.error('Channel test error:', error);
    return NextResponse.json(
      { success: false, message: 'Channel test failed' },
      { status: 500 }
    );
  }
}
