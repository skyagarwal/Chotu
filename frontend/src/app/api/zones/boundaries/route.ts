import { NextResponse } from 'next/server'

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200'

// Default Nashik zone as fallback
const NASHIK_DEFAULT_ZONE = {
  id: 1,
  name: 'Nashik City',
  coordinates: [
    { lat: 20.0500, lng: 73.7500 },
    { lat: 20.0500, lng: 73.8500 },
    { lat: 19.9500, lng: 73.8500 },
    { lat: 19.9500, lng: 73.7500 },
    { lat: 20.0500, lng: 73.7500 },
  ]
}

export async function GET() {
  try {
    // Try to fetch zones from backend
    const response = await fetch(`${BACKEND_INTERNAL_URL}/api/zones/boundaries`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }

    // If backend doesn't have zones endpoint, return default Nashik zone
    console.log('Using default Nashik zone as fallback')
    return NextResponse.json({
      success: true,
      zones: [NASHIK_DEFAULT_ZONE],
      message: 'Using default zone'
    })
  } catch (error) {
    console.error('Failed to fetch zone boundaries:', error)
    
    // Return default zone on error
    return NextResponse.json({
      success: true,
      zones: [NASHIK_DEFAULT_ZONE],
      message: 'Using fallback zone'
    })
  }
}
