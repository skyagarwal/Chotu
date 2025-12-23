'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MapPin, Navigation, Check, X } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents } from 'react-leaflet'
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in Next.js
import L from 'leaflet'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LocationPickerProps {
  initialLat?: number
  initialLng?: number
  onLocationConfirm: (location: {
    lat: number
    lng: number
    address: string
    landmark?: string
    locality?: string
    city?: string
    pincode?: string
  }) => void
  onCancel: () => void
}

interface ZoneBoundary {
  id: number
  name: string
  coordinates: Array<{ lat: number; lng: number }>
  center: { lat: number; lng: number }
}

// Component to handle map clicks and dragging
function LocationMarker({ position, setPosition, onPositionChange }: {
  position: { lat: number; lng: number }
  setPosition: (pos: { lat: number; lng: number }) => void
  onPositionChange: (lat: number, lng: number) => void
}) {
  const markerRef = useRef<L.Marker | null>(null)

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setPosition({ lat, lng })
      onPositionChange(lat, lng)
    },
  })

  useEffect(() => {
    if (markerRef.current) {
      const marker = markerRef.current
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        setPosition({ lat, lng })
        onPositionChange(lat, lng)
      })
    }
  }, [setPosition, onPositionChange])

  return position ? (
    <Marker 
      position={[position.lat, position.lng]} 
      draggable={true}
      ref={markerRef}
    >
      <Popup>
        Selected Location<br />
        {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
      </Popup>
    </Marker>
  ) : null
}

export default function OSMLocationPicker({
  initialLat,
  initialLng,
  onLocationConfirm,
  onCancel,
}: LocationPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  )
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [locality, setLocality] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [zoneBoundaries, setZoneBoundaries] = useState<ZoneBoundary[]>([])
  const [isInZone, setIsInZone] = useState<boolean | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  // Fetch zone boundaries from backend
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch('/api/zones/boundaries')
        const data = await response.json()
        
        if (data.success && data.zones) {
          setZoneBoundaries(data.zones)
          console.log('✅ Loaded zone boundaries:', data.zones.length)
        }
      } catch (error) {
        console.error('Failed to fetch zone boundaries:', error)
      }
    }
    
    fetchZones()
  }, [])

  // Check if point is in any zone polygon
  const isPointInZone = useCallback((lat: number, lng: number) => {
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
      
      if (inside) return true
    }
    
    return false
  }, [zoneBoundaries])

  // Update zone status when position changes
  useEffect(() => {
    if (position && zoneBoundaries.length > 0) {
      const inZone = isPointInZone(position.lat, position.lng)
      setIsInZone(inZone)
      
      // Log zone validation result
      console.log(`🎯 Zone validation: ${inZone ? 'Inside' : 'Outside'} service area`, {
        lat: position.lat,
        lng: position.lng,
        zones: zoneBoundaries.length
      })
    }
  }, [position, zoneBoundaries, isPointInZone])

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
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
        
        // Pan map to new position
        if (mapRef.current) {
          mapRef.current.setView([newPos.lat, newPos.lng], 16)
        }
        
        setIsFetchingLocation(false)
        
        // Reverse geocode
        reverseGeocode(newPos.lat, newPos.lng)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Unable to get your location. Please enable location access.')
        setIsFetchingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [])

  // Reverse geocode coordinates to address using Nominatim (OSM)
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true)
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Mangwale-App/1.0'
          }
        }
      )
      
      const data = await response.json()
      
      if (data && data.address) {
        const addr = data.address
        
        // Build full address
        const parts = []
        if (addr.house_number) parts.push(addr.house_number)
        if (addr.road) parts.push(addr.road)
        if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb)
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village)
        if (addr.state) parts.push(addr.state)
        if (addr.postcode) parts.push(addr.postcode)
        
        setAddress(data.display_name || parts.join(', '))
        setLocality(addr.neighbourhood || addr.suburb || '')
        setCity(addr.city || addr.town || addr.village || '')
        setPincode(addr.postcode || '')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      // Fallback to coordinates
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    } finally {
      setIsGeocoding(false)
    }
  }

  // Get initial location on mount
  useEffect(() => {
    if (!position) {
      getCurrentLocation()
    }
  }, [position, getCurrentLocation])

  const handlePositionChange = (lat: number, lng: number) => {
    reverseGeocode(lat, lng)
    
    // Check zone - wait for zones to load first
    if (zoneBoundaries.length > 0) {
      const inZone = isPointInZone(lat, lng)
      setIsInZone(inZone)
      
      // Only show alert if definitely outside zone
      if (inZone === false) {
        alert('⚠️ This location is outside our service area. Please choose a location within the highlighted zones.')
      }
    }
  }

  const handleConfirm = () => {
    if (!position) {
      alert('Please select a location on the map')
      return
    }

    if (!address.trim()) {
      alert('Please wait while we fetch the address')
      return
    }

    // Check if location is in serviceable zone (only if zones are loaded)
    if (zoneBoundaries.length > 0) {
      const inZone = isPointInZone(position.lat, position.lng)
      
      if (!inZone) {
        alert('⚠️ Sorry, we don\'t service this area yet. Please select a location within the highlighted green zones on the map.')
        return
      }
    }

    onLocationConfirm({
      lat: position.lat,
      lng: position.lng,
      address: address.trim(),
      landmark: landmark.trim() || undefined,
      locality: locality.trim() || undefined,
      city: city.trim() || undefined,
      pincode: pincode.trim() || undefined,
    })
  }

  if (!position) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="animate-pulse mb-4">
            <MapPin className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Getting your location...</h3>
          <p className="text-sm sm:text-base text-gray-600">
            Please allow location access when prompted
          </p>
          <button
            onClick={onCancel}
            className="mt-6 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full h-full sm:rounded-2xl sm:w-full sm:max-w-4xl sm:h-[90vh] flex flex-col shadow-2xl">
        {/* Header - Fixed */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b bg-gradient-to-r from-green-600 to-green-700 text-white flex items-center justify-between flex-shrink-0 sm:rounded-t-2xl">
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              Choose Location
            </h2>
            <p className="text-xs text-green-100 mt-0.5 hidden sm:block">
              🟢 Green areas show serviceable zones
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-full transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X className="w-6 h-6 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Status Badge - Mobile: Simple, Desktop: Detailed */}
        <div className="px-3 py-2 sm:px-4 bg-gray-50 border-b flex items-center justify-between flex-shrink-0">
          <p className="text-xs sm:text-sm text-gray-700">
            💡 Drag pin to select location
          </p>
          {isInZone !== null && (
            <div className={`text-xs sm:text-sm font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full ${
              isInZone 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {isInZone ? '✓ In Zone' : '✗ Out'}
            </div>
          )}
        </div>

        {/* Content Area - Responsive: Mobile Vertical, Desktop 2-Column */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Map - Mobile: 40% height, Desktop: 50% width */}
          <div className="h-[40vh] sm:h-auto sm:w-1/2 relative sm:border-r">
            <MapContainer
              center={[position.lat, position.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Draw zone boundaries */}
              {zoneBoundaries.map((zone) => (
                <Polygon
                  key={zone.id}
                  positions={zone.coordinates.map(c => [c.lat, c.lng] as LatLngExpression)}
                  pathOptions={{
                    color: '#059669',
                    fillColor: '#10b981',
                    fillOpacity: 0.2,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div className="text-center">
                      <strong className="text-green-700">{zone.name}</strong><br />
                      <span className="text-green-600 text-sm">✓ Service Available</span>
                    </div>
                  </Popup>
                </Polygon>
              ))}
              
              {/* Draggable marker */}
              <LocationMarker 
                position={position} 
                setPosition={setPosition}
                onPositionChange={handlePositionChange}
              />
            </MapContainer>
            
            {/* Current Location Button - LARGE on Mobile */}
            <button
              onClick={getCurrentLocation}
              disabled={isFetchingLocation}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white p-4 sm:p-3 rounded-full shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all z-[1000] border-2 border-white touch-manipulation"
              title="Use my current location"
            >
              <Navigation className={`w-7 h-7 sm:w-6 sm:h-6 ${isFetchingLocation ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Zoom Tip - Desktop Only */}
            <div className="hidden sm:block absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-xs text-gray-700 z-[1000]">
              <strong>Tip:</strong> Use +/- to zoom, drag to pan
            </div>
          </div>

          {/* Form - Mobile: Scrollable 60% height, Desktop: 50% width no scroll */}
          <div className="flex-1 sm:w-1/2 p-4 sm:p-6 flex flex-col overflow-y-auto sm:overflow-y-visible">
            <p className="text-sm text-gray-600 mb-3 sm:mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📍</span>
              <span>Drag the pin to adjust location</span>
            </p>

            {/* Address - Larger tap targets for mobile */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Address {isGeocoding && <span className="text-xs text-blue-600 font-normal">(loading...)</span>}
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none touch-manipulation"
                rows={2}
                placeholder="Address will appear here..."
                disabled={isGeocoding}
              />
            </div>

            {/* Landmark */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Landmark <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 touch-manipulation"
                placeholder="e.g., Near ABC Mall"
              />
            </div>

            {/* Locality & City - Stack on very small screens */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Area
                </label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 touch-manipulation"
                  placeholder="Area"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 touch-manipulation"
                  placeholder="City"
                />
              </div>
            </div>

            {/* Pincode */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Pincode
              </label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 touch-manipulation"
                placeholder="Postal code"
                inputMode="numeric"
              />
            </div>

            {/* Coordinates Display */}
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg mb-3 sm:mb-4 font-mono">
              📍 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </div>

            {/* Spacer - Desktop only */}
            <div className="hidden sm:block flex-1"></div>

            {/* Action Buttons - Sticky at bottom on mobile */}
            <div className="flex gap-3 pt-3 sm:pt-4 sm:border-t sticky bottom-0 bg-white sm:relative -mx-4 px-4 pb-4 sm:mx-0 sm:px-0 sm:pb-0 border-t sm:border-t-0">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3.5 sm:py-3 text-base sm:text-sm font-semibold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isGeocoding || !address || isInZone === false}
                className="flex-1 px-4 py-3.5 sm:py-3 text-base sm:text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 flex items-center justify-center gap-2 transition-all shadow-lg touch-manipulation"
              >
                <Check className="w-5 h-5" />
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
