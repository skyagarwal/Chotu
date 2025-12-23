import { NextRequest, NextResponse } from "next/server";

const IMAGE_AI_URL = process.env.IMAGE_AI_INTERNAL_URL || "http://image-ai-api:3000";

// GET single camera
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${IMAGE_AI_URL}/cameras/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Camera not found" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching camera:", error);
    return NextResponse.json(
      { error: "Failed to fetch camera" },
      { status: 500 }
    );
  }
}

// UPDATE camera
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const response = await fetch(`${IMAGE_AI_URL}/cameras/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || "Failed to update camera" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating camera:", error);
    return NextResponse.json(
      { error: "Failed to update camera" },
      { status: 500 }
    );
  }
}

// DELETE camera
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${IMAGE_AI_URL}/cameras/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || "Failed to delete camera" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: "Camera deleted successfully" });
  } catch (error) {
    console.error("Error deleting camera:", error);
    return NextResponse.json(
      { error: "Failed to delete camera" },
      { status: 500 }
    );
  }
}
