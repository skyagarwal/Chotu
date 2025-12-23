import { NextResponse } from "next/server";

// Mercury server TTS is on port 7002 (not 8010)
const TTS_URL = process.env.TTS_SERVICE_URL || "http://192.168.0.151:7002";

export async function GET() {
  try {
    const response = await fetch(`${TTS_URL}/health`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ 
      status: "offline", 
      model_loaded: false,
      voices: [],
      emotions: []
    }, { status: 503 });
  } catch (error) {
    console.error("TTS health check failed:", error);
    return NextResponse.json({ 
      status: "offline", 
      model_loaded: false,
      voices: [],
      emotions: [],
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 503 });
  }
}
