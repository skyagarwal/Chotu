import { NextRequest, NextResponse } from "next/server";

const IMAGE_AI_URL = process.env.IMAGE_AI_INTERNAL_URL || "http://image-ai-api:3000";

// Test camera connection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${IMAGE_AI_URL}/cameras/${id}/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: errorText || "Failed to test camera connection" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: "Camera connection successful",
      ...data
    });
  } catch (error) {
    console.error("Error testing camera:", error);
    return NextResponse.json(
      { success: false, error: "Failed to test camera connection" },
      { status: 500 }
    );
  }
}
