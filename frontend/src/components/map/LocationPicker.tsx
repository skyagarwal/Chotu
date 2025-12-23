'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MapPin, Navigation, Check, X } from 'lucide-react'
import PlacesAutocomplete from './PlacesAutocomplete'

type LatLngLiteral = { lat: number; lng: number }

interface GoogleLatLng {
  lat: () => number
  lng: () => number
}

interface MapMouseEvent {
  latLng: GoogleLatLng | null
}

interface GoogleMapInstance {
  setCenter: (position: LatLngLiteral) => void
  setZoom: (zoom: number) => void
}

interface GoogleMarkerInstance {
  setPosition: (position: LatLngLiteral) => void
  getPosition: () => GoogleLatLng | null
  addListener: (eventName: 'dragend', handler: () => void) => void
}

interface GoogleGeocoderComponent {
  long_name: string
  types: string[]
}

interface GoogleGeocoderResult {
  formatted_address: string
  address_components: GoogleGeocoderComponent[]
}

interface GoogleGeocoderResponse {
  results: GoogleGeocoderResult[]
}

interface GoogleGeocoder {
  geocode: (request: { location: LatLngLiteral }) => Promise<GoogleGeocoderResponse>
}

interface GooglePolygonInstance {
  addListener: (eventName: 'click', handler: (event: MapMouseEvent) => void) => void
}

interface GoogleInfoWindow {
  setPosition: (position: GoogleLatLng | LatLngLiteral | null) => void
  open: (map: GoogleMapInstance) => void
}

interface GoogleMapsApi {
  Map: new (
    element: HTMLElement,
    options: {
      center: LatLngLiteral
      zoom: number
      mapTypeControl?: boolean
      streetViewControl?: boolean
      fullscreenControl?: boolean
      zoomControl?: boolean
      zoomControlOptions?: {
        position: number
      }
    }
  ) => GoogleMapInstance
  Marker: new (options: {
    position: LatLngLiteral
    map: GoogleMapInstance
    draggable?: boolean
    animation?: unknown
    icon?: { url: string }
  }) => GoogleMarkerInstance
  Geocoder: new () => GoogleGeocoder
  Polygon: new (options: {
    paths: LatLngLiteral[]
    strokeColor: string
    strokeOpacity: number
    strokeWeight: number
    fillColor: string
    fillOpacity: number
    map: GoogleMapInstance
  }) => GooglePolygonInstance
  InfoWindow: new (options: { content: string }) => GoogleInfoWindow
  Animation: {
    DROP: unknown
  }
  ControlPosition: Record<string, number>
}

interface GoogleGlobal {
  maps: GoogleMapsApi
}

const getMapsApi = (): GoogleMapsApi | null => {
  if (typeof window === 'undefined' || !window.google?.maps) {
    return null
  }

  return window.google.maps
}

interface LocationPickerProps {
  initialLat?: number
  initialLng?: number
  onLocationConfirm: (location: {
    lat: number
    lng: number
    address: string
    road?: string
    house?: string
    floor?: string
    contact_person_name?: string
    contact_person_number?: string
    address_type?: string
    zoneId?: number
  }) => void
  onCancel: () => void
}

export default function LocationPicker({
  initialLat,
  initialLng,
  onLocationConfirm,
  onCancel,
}: LocationPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  )
  const [address, setAddress] = useState('')
  const [road, setRoad] = useState('')
  const [house, setHouse] = useState('')
  const [floor, setFloor] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [map, setMap] = useState<GoogleMapInstance | null>(null)
  const [marker, setMarker] = useState<GoogleMarkerInstance | null>(null)
  const [zoneBoundaries, setZoneBoundaries] = useState<Array<{
    id: number
    name: string
    coordinates: Array<{ lat: number; lng: number }>
  }>>([])
  const [isInZone, setIsInZone] = useState<boolean | null>(null)
  const [currentZoneId, setCurrentZoneId] = useState<number | null>(null)
  const zonesLoadedRef = useRef(false)

  // Fetch zone boundaries from backend
  useEffect(() => {
    if (zonesLoadedRef.current) {
      return
    }

    zonesLoadedRef.current = true

    const fetchZones = async () => {
      try {
        const response = await fetch('/api/zones/boundaries')
        const data = await response.json()

        if (data.success && data.zones) {
          setZoneBoundaries(data.zones)
          console.log('✅ Loaded zone boundaries:', data.zones.length)

          if (!position && data.zones.length > 0 && data.zones[0].center) {
            const firstZoneCenter = data.zones[0].center
            console.log('📍 Using first zone center as default:', firstZoneCenter)
            setPosition(firstZoneCenter)
          }
        }
      } catch (error) {
        console.error('Failed to fetch zone boundaries:', error)
        if (!position) {
          console.log('📍 Using Nashik city center as fallback')
          setPosition({ lat: 20.0, lng: 73.78 })
        }
      }
    }

    fetchZones()
  }, [position])

  // Check if point is in any zone polygon (client-side validation)
  const getZoneIdForPoint = useCallback((lat: number, lng: number) => {
    for (const zone of zoneBoundaries) {
      if (zone.coordinates.length < 3) continue
      
      let inside = false
      const coords = zone.coordinates
      
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i].lng
        const yi = coords[i].lat
        const xj = coords[j].lng
        const yj = coords[j].lat
        
        const intersect = ((yi > lat) !== (yj > lat)) && 
          (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
        
        if (intersect) inside = !inside
      }
      
      if (inside) return zone.id
    }
    
    return null
  }, [zoneBoundaries])

  // Update zone status when position changes
  useEffect(() => {
    if (position && zoneBoundaries.length > 0) {
      const zoneId = getZoneIdForPoint(position.lat, position.lng)
      setIsInZone(zoneId !== null)
      setCurrentZoneId(zoneId)
      
      if (zoneId === null) {
        console.warn('⚠️ Location outside serviceable zones')
      }
    }
  }, [position, zoneBoundaries, getZoneIdForPoint])

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, using Nashik as default')
      // Fallback to Nashik city center
      const nashikCenter = { lat: 20.0, lng: 73.78 }
      setPosition(nashikCenter)
      setIsFetchingLocation(false)
      return
    }

    setIsFetchingLocation(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setPosition(newPos)
        
        // Move map to new position
        if (map) {
          map.setCenter(newPos)
          map.setZoom(16)
        }
        
        // Move marker
        if (marker) {
          marker.setPosition(newPos)
        }
        
        setIsFetchingLocation(false)
        
        // Reverse geocode
        reverseGeocode(newPos.lat, newPos.lng)
      },
      (error) => {
        console.error('Error getting location:', error)
        console.log('Using Nashik as default location')
        // Fallback to Nashik city center when GPS fails
        const nashikCenter = { lat: 20.0, lng: 73.78 }
        setPosition(nashikCenter)
        setIsFetchingLocation(false)
        
        // Reverse geocode Nashik location
        reverseGeocode(nashikCenter.lat, nashikCenter.lng)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [map, marker])

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true)

    const maps = getMapsApi()
    if (!maps) {
      setIsGeocoding(false)
      return
    }

    try {
      const geocoder = new maps.Geocoder()
      const { results } = await geocoder.geocode({ location: { lat, lng } })

      if (results.length > 0) {
        const place = results[0]

        let streetNumber = ''
        let route = ''

        place.address_components.forEach((component) => {
          const componentTypes = component.types

          if (componentTypes.includes('street_number')) {
            streetNumber = component.long_name
          }
          if (componentTypes.includes('route')) {
            route = component.long_name
          }
        })

        setAddress(place.formatted_address)

        if (route) {
          setRoad(route)
        }

        if (streetNumber) {
          setHouse(streetNumber)
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    } finally {
      setIsGeocoding(false)
    }
  }

  // Initialize Google Map
  useEffect(() => {
    if (!position) {
      return
    }

    const initMap = () => {
      const maps = getMapsApi()
      if (!maps) {
        return
      }

      const mapElement = document.getElementById('location-map')
      if (!mapElement) {
        return
      }

      const mapInstance = new maps.Map(mapElement, {
        center: position,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: maps.ControlPosition.RIGHT_TOP ?? 0,
        },
      })

      const markerInstance = new maps.Marker({
        position,
        map: mapInstance,
        draggable: true,
        animation: maps.Animation.DROP,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        },
      })

      markerInstance.addListener('dragend', () => {
        const newPos = markerInstance.getPosition()
        if (newPos) {
          const lat = newPos.lat()
          const lng = newPos.lng()
          setPosition({ lat, lng })
          reverseGeocode(lat, lng)

          const inZone = getZoneIdForPoint(lat, lng) !== null
          setIsInZone(inZone)

          if (!inZone) {
            alert('⚠️ This location is outside our service area. Please choose a location within the highlighted zones.')
          }
        }
      })

      setMap(mapInstance)
      setMarker(markerInstance)

      if (zoneBoundaries.length > 0) {
        let polygonsCreated = 0

        zoneBoundaries.forEach((zone) => {
          const polygon = new maps.Polygon({
            paths: zone.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
            strokeColor: '#10b981',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#10b981',
            fillOpacity: 0.15,
            map: mapInstance,
          })

          const infoWindow = new maps.InfoWindow({
            content: `<div style="padding: 8px;">
              <strong>${zone.name}</strong><br>
              <span style="color: #10b981;">✓ Service Available</span>
            </div>`,
          })

          polygon.addListener('click', (event: MapMouseEvent) => {
            const latLng = event.latLng
            if (latLng) {
              infoWindow.setPosition(latLng)
              infoWindow.open(mapInstance)
            }
          })

          polygonsCreated += 1
        })

        console.log(`✅ Drew ${polygonsCreated} zone boundaries on map`)
      }

      reverseGeocode(position.lat, position.lng)
    }

    const mapsApi = getMapsApi()
    if (mapsApi) {
      initMap()
      return
    }

    const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', initMap, { once: true })
      return () => existingScript.removeEventListener('load', initMap)
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}`
    script.async = true
    script.defer = true
    script.addEventListener('load', initMap, { once: true })
    document.head.appendChild(script)

    return () => {
      script.removeEventListener('load', initMap)
    }
  }, [position, zoneBoundaries, getZoneIdForPoint])

  // Get initial location on mount
  useEffect(() => {
    if (!position) {
      getCurrentLocation()
    }
  }, [getCurrentLocation, position])

  const handleConfirm = () => {
    if (!position) {
      alert('Please select a location on the map')
      return
    }

    if (!address.trim()) {
      alert('Please wait while we fetch the address')
      return
    }

    // Check if location is in serviceable zone
    if (isInZone === false) {
      alert('⚠️ Sorry, we don\'t service this area yet. Please select a location within the highlighted green zones on the map.')
      return
    }

    onLocationConfirm({
      lat: position.lat,
      lng: position.lng,
      address: address.trim(),
      road: road.trim() || undefined,
      house: house.trim() || undefined,
      floor: floor.trim() || undefined,
      zoneId: currentZoneId || undefined
    })
  }

  // Handle place selection from autocomplete
  const handlePlaceSelect = useCallback((place: {
    lat: number
    lng: number
    address: string
    locality?: string
    city?: string
    pincode?: string
  }) => {
    // Update position
    const newPos = { lat: place.lat, lng: place.lng }
    setPosition(newPos)
    
    // Update address fields
    setAddress(place.address)
    
    // Move map to new position
    if (map) {
      map.setCenter(newPos)
      map.setZoom(16)
    }
    
    // Move marker
    if (marker) {
      marker.setPosition(newPos)
    }
    
    // Trigger reverse geocode to extract road/house details
    reverseGeocode(place.lat, place.lng)
  }, [map, marker])

  if (!position) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center text-gray-900">
          <div className="animate-pulse mb-6">
            <MapPin className="w-16 h-16 mx-auto text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Getting your location...</h3>
          <p className="text-base text-gray-700 mb-6">
            Please allow location access when prompted
          </p>
          <button
            onClick={onCancel}
            className="w-full px-6 py-4 border-2 border-gray-400 rounded-lg hover:bg-gray-50 active:bg-gray-100 text-base font-bold text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white text-gray-900 w-full h-full sm:rounded-2xl sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header - Green with White Text - Mobile Optimized */}
        <div className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white flex items-center justify-between flex-shrink-0 sm:rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 flex-shrink-0" />
              <span>Choose Location</span>
            </h2>
            {zoneBoundaries.length > 0 && (
              <p className="text-xs text-green-50 mt-0.5">
                🟢 Green areas show serviceable zones
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Places Autocomplete Search - Mobile Optimized */}
        <div className="p-3 border-b bg-gray-50 flex-shrink-0">
          <PlacesAutocomplete
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for your location..."
          />
          <div className="flex items-center justify-between mt-2 gap-2">
            <p className="text-xs text-gray-600 font-medium flex-1">
              💡 Drag the pin to adjust location
            </p>
            {isInZone !== null && (
              <div className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                isInZone 
                  ? 'bg-green-100 text-green-800 border border-green-400' 
                  : 'bg-red-100 text-red-800 border border-red-400'
              }`}>
                {isInZone ? '✓ In Zone' : '✗ Outside'}
              </div>
            )}
          </div>
        </div>

        {/* Map - Mobile Optimized with Larger GPS Button */}
        <div className="relative h-[35vh] sm:h-64 flex-shrink-0 border-b">
          <div id="location-map" className="w-full h-full" />
          
          {/* Current Location Button - Large & Touch-Friendly - Bottom Left */}
          <button
            onClick={getCurrentLocation}
            disabled={isFetchingLocation}
            className="absolute bottom-3 left-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white p-3 rounded-full shadow-xl disabled:opacity-50 transition-all z-10 border-2 border-white"
            title="Use my current location"
            aria-label="Get current location"
          >
            <Navigation className={`w-5 h-5 ${isFetchingLocation ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Address Details - Mobile Optimized with Compact Inputs */}
        <div className="p-4 flex-1 overflow-y-auto bg-white">
          {/* Auto-fetched Address - Read-only */}
          <div className="mb-3">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Address {isGeocoding && <span className="text-blue-600 font-normal">(loading...)</span>}
            </label>
            <textarea
              value={address}
              readOnly
              className="w-full px-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg resize-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              rows={2}
              placeholder="Address will appear here..."
            />
          </div>

          {/* Coordinates Display */}
          <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg font-mono text-center">
            📍 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </div>
        </div>

        {/* Action Buttons - Compact */}
        <div className="p-3 border-t flex gap-3 flex-shrink-0 bg-white">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-bold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isGeocoding || !address}
            className="flex-1 px-4 py-3 text-sm font-bold bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md disabled:shadow-none"
          >
            <Check className="w-5 h-5" />
            <span>Confirm</span>
          </button>
        </div>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    google?: GoogleGlobal
  }
}
