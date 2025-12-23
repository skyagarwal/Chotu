import { NextResponse } from "next/server";

const ASR_URL = process.env.ASR_SERVICE_URL || "http://192.168.0.151:7001";

export async function GET() {
  try {
    const response = await fetch(`${ASR_URL}/health`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ 
      status: "offline"
    }, { status: 503 });
  } catch (error) {
    console.error("ASR health check failed:", error);
    return NextResponse.json({ 
      status: "offline", 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 503 });
  }
}
