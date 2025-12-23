import { NextResponse } from "next/server";

const EXOTEL_URL = process.env.EXOTEL_SERVICE_URL || "http://192.168.0.151:3100";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${EXOTEL_URL}/click-to-call/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Click-to-call failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
