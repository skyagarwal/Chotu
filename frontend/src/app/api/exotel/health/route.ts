import { NextResponse } from "next/server";

const EXOTEL_URL = process.env.EXOTEL_SERVICE_URL || "http://192.168.0.151:3100";

export async function GET() {
  try {
    const response = await fetch(`${EXOTEL_URL}/health`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ 
      status: "offline", 
      error: "Service not responding" 
    }, { status: 503 });
  } catch (error) {
    console.error("Exotel health check failed:", error);
    return NextResponse.json({ 
      status: "offline", 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 503 });
  }
}
