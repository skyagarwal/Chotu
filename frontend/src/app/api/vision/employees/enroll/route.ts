import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    console.log('📤 Enrolling to:', IMAGE_AI_URL);
    
    const response = await fetch(`${IMAGE_AI_URL}/employees/enroll`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    console.log('📥 Backend response:', data.success ? '✅ Success' : '❌ Failed', data.message);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Enrollment failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to process enrollment request' },
      { status: 500 }
    );
  }
}
