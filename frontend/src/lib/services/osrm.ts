/**
 * OSRM (Open Source Routing Machine) Service
 * Calculate distances and routes using self-hosted OSRM
 * 
 * Strategy: OSRM First, Google Maps Fallback
 * - OSRM: Fast, free, self-hosted, trainable on India data
 * - Google: Fallback for reliability, global coverage
 */

const OSRM_BASE_URL = process.env.NEXT_PUBLIC_OSRM_URL || 'http://100.121.40.69:5000'
const USE_GOOGLE_FALLBACK = true // Set to false to disable Google fallback

export interface OSRMDistance {
  distance: number // meters
  duration: number // seconds
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}

export interface OSRMRoute {
  distance: number // meters
  duration: number // seconds
  geometry: string // encoded polyline
  steps?: Array<{
    distance: number
    duration: number
    instruction: string
  }>
}

interface OSRMRawStep {
  distance: number
  duration: number
  maneuver: {
    instruction?: string
  }
}

interface OSRMRouteResponse {
  code: string
  message?: string
  routes?: Array<{
    distance: number
    duration: number
    geometry: string
    legs: Array<{
      steps?: OSRMRawStep[]
    }>
  }>
}

/**
 * Calculate distance between two points using OSRM Table service
 * More efficient than route service when you only need distance/duration
 * Falls back to Google Maps Distance Matrix if OSRM fails
 */
export async function calculateDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<OSRMDistance | null> {
  try {
    // Try OSRM first (primary, self-hosted)
    const osrmResult = await calculateDistanceOSRM(origin, destination)
    if (osrmResult) {
      console.log('✅ Distance calculated via OSRM')
      return osrmResult
    }

    // Fallback to Google Maps if enabled
    if (USE_GOOGLE_FALLBACK) {
      console.log('⚠️ OSRM failed, falling back to Google Maps')
      const googleResult = await calculateDistanceGoogle(origin, destination)
      if (googleResult) {
        console.log('✅ Distance calculated via Google Maps (fallback)')
        return googleResult
      }
    }

    return null
  } catch (error) {
    console.error('Error calculating distance:', error)
    return null
  }
}

/**
 * OSRM Distance Calculation (Primary)
 */
async function calculateDistanceOSRM(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<OSRMDistance | null> {
  try {
    // OSRM Table API: /table/v1/{profile}/{coordinates}
    // Format: lng,lat;lng,lat (note: longitude first!)
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
    const url = `${OSRM_BASE_URL}/table/v1/driving/${coordinates}?annotations=distance,duration`

    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('OSRM API error:', response.status, response.statusText)
      return null
    }

    const data = await response.json()

    if (data.code !== 'Ok') {
      console.error('OSRM returned error:', data.code, data.message)
      return null
    }

    // Table API returns matrices: [0][1] is origin to destination
    const distance = data.distances[0][1] // meters
    const duration = data.durations[0][1] // seconds

    return {
      distance,
      duration,
      origin,
      destination
    }
  } catch (error) {
    console.error('Error calculating distance with OSRM:', error)
    return null
  }
}

/**
 * Calculate distances from one origin to multiple destinations
 * Returns array of distances in same order as destinations
 */
export async function calculateDistances(
  origin: { lat: number; lng: number },
  destinations: Array<{ lat: number; lng: number }>
): Promise<OSRMDistance[]> {
  try {
    // Build coordinates string: origin;dest1;dest2;dest3...
    const coords = [
      `${origin.lng},${origin.lat}`,
      ...destinations.map(d => `${d.lng},${d.lat}`)
    ].join(';')

    const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?annotations=distance,duration&sources=0`

    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('OSRM API error:', response.status, response.statusText)
      return []
    }

    const data = await response.json()

    if (data.code !== 'Ok') {
      console.error('OSRM returned error:', data.code, data.message)
      return []
    }

    // Map results to destinations
    return destinations.map((dest, idx) => ({
      distance: data.distances[0][idx + 1], // +1 because origin is at index 0
      duration: data.durations[0][idx + 1],
      origin,
      destination: dest
    }))
  } catch (error) {
    console.error('Error calculating distances with OSRM:', error)
    return []
  }
}

/**
 * Get full route with turn-by-turn directions
 */
export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  steps = false
): Promise<OSRMRoute | null> {
  try {
    // OSRM Route API: /route/v1/{profile}/{coordinates}
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
    const stepsParam = steps ? '&steps=true' : ''
    const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full${stepsParam}`

    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('OSRM API error:', response.status, response.statusText)
      return null
    }

    const data: OSRMRouteResponse = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM returned error or no routes:', data.code)
      return null
    }

    const route = data.routes[0]

    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      steps: steps && route.legs[0]?.steps ? route.legs[0].steps.map((step: OSRMRawStep) => ({
        distance: step.distance,
        duration: step.duration,
        instruction: step.maneuver.instruction || ''
      })) : undefined
    }
  } catch (error) {
    console.error('Error getting route from OSRM:', error)
    return null
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`
  }
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

/**
 * Google Maps Distance Matrix API (Fallback)
 * Only used when OSRM is unavailable
 */
type CoordinateLiteral = { lat: number; lng: number }

interface DistanceMatrixElement {
  status?: string
  distance?: { value: number }
  duration?: { value: number }
}

interface DistanceMatrixResponse {
  rows?: Array<{ elements?: DistanceMatrixElement[] }>
}

interface DistanceMatrixService {
  getDistanceMatrix: (
    request: {
      origins: CoordinateLiteral[]
      destinations: CoordinateLiteral[]
      travelMode: unknown
      unitSystem: unknown
    },
    callback: (response: DistanceMatrixResponse, status: string) => void
  ) => void
}

interface GoogleMapsDistanceApi {
  DistanceMatrixService: new () => DistanceMatrixService
  TravelMode: { DRIVING: unknown }
  UnitSystem: { METRIC: unknown }
}

async function calculateDistanceGoogle(
  origin: CoordinateLiteral,
  destination: CoordinateLiteral
): Promise<OSRMDistance | null> {
  try {
    // Check if Google Maps API is loaded
    if (typeof window === 'undefined') {
      console.warn('Google Maps API not loaded, cannot use fallback')
      return null
    }

    const mapsApi = window.google?.maps as GoogleMapsDistanceApi | undefined

    if (!mapsApi) {
      console.warn('Google Maps API not loaded, cannot use fallback')
      return null
    }

    return new Promise((resolve) => {
      const service = new mapsApi.DistanceMatrixService()
      
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: mapsApi.TravelMode.DRIVING,
          unitSystem: mapsApi.UnitSystem.METRIC,
        },
        (response: DistanceMatrixResponse, status: string) => {
          const element = response.rows?.[0]?.elements?.[0]

          if (status === 'OK' && element?.status === 'OK') {
            if (element.distance && element.duration) {
              resolve({
                distance: element.distance.value, // meters
                duration: element.duration.value, // seconds
                origin,
                destination
              })
              return
            }
          }
          console.error('Google Distance Matrix API error:', status)
          resolve(null)
        }
      )
    })
  } catch (error) {
    console.error('Error using Google Maps fallback:', error)
    return null
  }
}

/**
 * Health check for OSRM service
```
 */
export async function checkOSRMHealth(): Promise<boolean> {
  try {
    // Use a simple nearest query as health check
    // Coordinates: Bangalore city center
    const url = `${OSRM_BASE_URL}/nearest/v1/driving/77.5946,12.9716?number=1`
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return response.ok
  } catch {
    return false
  }
}
