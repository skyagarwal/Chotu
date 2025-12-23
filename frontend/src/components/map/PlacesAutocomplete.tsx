'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: {
    lat: number
    lng: number
    address: string
    locality?: string
    city?: string
    pincode?: string
  }) => void
  placeholder?: string
}

interface AutocompletePrediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

interface LatLngInstance {
  lat: () => number
  lng: () => number
}

type LatLngBoundsInstance = unknown

interface GeocodeResult {
  geometry?: {
    location?: LatLngInstance
  }
  address_components: Array<{
    types: string[]
    long_name: string
  }>
  formatted_address: string
}

interface GeocodeResponse {
  results?: GeocodeResult[]
}

interface GoogleMapsGeocoder {
  geocode: (request: { placeId: string }) => Promise<GeocodeResponse>
}

type AutocompleteSessionToken = unknown

interface GoogleMapsPlacesService {
  getPlacePredictions:
    (request: {
      input: string
      sessionToken: AutocompleteSessionToken
      componentRestrictions?: { country: string }
      types?: string[]
      locationBias?: LatLngBoundsInstance
    }, callback: (results: AutocompletePrediction[] | null, status: string) => void) => void
}

interface GooglePlacesNamespace {
  AutocompleteService: new () => GoogleMapsPlacesService
  AutocompleteSessionToken: new () => AutocompleteSessionToken
  PlacesServiceStatus: {
    OK: string
    [key: string]: string
  }
}

interface GoogleMapsApi {
  places?: GooglePlacesNamespace
  Geocoder: new () => GoogleMapsGeocoder
  LatLng: new (lat: number, lng: number) => LatLngInstance
  LatLngBounds: new (southWest: LatLngInstance, northEast: LatLngInstance) => LatLngBoundsInstance
}

const getMapsApi = (): GoogleMapsApi | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }

  return (window as typeof window & { google?: { maps?: GoogleMapsApi } }).google?.maps
}

export default function PlacesAutocomplete({ 
  onPlaceSelect, 
  placeholder = "Search for a location..." 
}: PlacesAutocompleteProps) {
  const [input, setInput] = useState('')
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const autocompleteService = useRef<GoogleMapsPlacesService | null>(null)
  const geocoder = useRef<GoogleMapsGeocoder | null>(null)
  const sessionToken = useRef<AutocompleteSessionToken | null>(null)

  // Initialize services when Google Maps is loaded
  useEffect(() => {
    const initServices = () => {
      const maps = getMapsApi()
      if (maps?.places) {
        autocompleteService.current = new maps.places.AutocompleteService()
        geocoder.current = new maps.Geocoder()
        sessionToken.current = new maps.places.AutocompleteSessionToken()
      }
    }

    // Check if Google Maps is already loaded
    if (getMapsApi()) {
      initServices()
    } else {
      // Wait for Google Maps to load
      const checkInterval = setInterval(() => {
        if (getMapsApi()) {
          initServices()
          clearInterval(checkInterval)
        }
      }, 100)

      return () => clearInterval(checkInterval)
    }
  }, [])

  // Fetch predictions when input changes
  useEffect(() => {
    const maps = getMapsApi()
    if (!input.trim() || !autocompleteService.current || !maps?.places) {
      setPredictions([])
      setShowDropdown(false)
      return
    }

    setIsLoading(true)

    // Debounce to avoid excessive API calls
    const timer = setTimeout(() => {
      // Create location bias for Nashik area (prioritize Nashik results)
      if (!maps.places) {
        setIsLoading(false)
        return
      }

      const places = maps.places

      if (!sessionToken.current) {
        sessionToken.current = new places.AutocompleteSessionToken()
      }

      const activeToken = sessionToken.current
      if (!activeToken) {
        setIsLoading(false)
        return
      }

      const nashikBounds = new maps.LatLngBounds(
        new maps.LatLng(19.85, 73.60), // Southwest corner
        new maps.LatLng(20.20, 74.00)  // Northeast corner
      )
      
      autocompleteService.current!.getPlacePredictions(
        {
          input: input,
          sessionToken: activeToken,
          componentRestrictions: { country: 'in' }, // Restrict to India
          types: ['geocode', 'establishment'], // Include addresses and places
          locationBias: nashikBounds, // Bias results to Nashik area
          // Alternative: use location and radius instead of bounds
          // location: new maps.LatLng(20.0, 73.78),
          // radius: 30000, // 30km radius around Nashik
        },
        (results: AutocompletePrediction[] | null, status: string) => {
          setIsLoading(false)
          if (status === places.PlacesServiceStatus.OK && results) {
            // Filter to only show results that mention Nashik, Maharashtra or nearby areas
            const filteredResults = results.filter((result: AutocompletePrediction) => {
              const desc = result.description.toLowerCase()
              return desc.includes('nashik') || 
                     desc.includes('maharashtra') ||
                     desc.includes('nashik district')
            })
            
            // If no Nashik results, show top 5 Maharashtra results as fallback
            const finalResults = filteredResults.length > 0 
              ? filteredResults 
              : results.filter((r: AutocompletePrediction) => r.description.toLowerCase().includes('maharashtra')).slice(0, 5)
            
            setPredictions(finalResults)
            setShowDropdown(finalResults.length > 0)
          } else {
            setPredictions([])
            setShowDropdown(false)
          }
        }
      )
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [input])

  // Handle place selection
  const handleSelectPlace = async (placeId: string, description: string) => {
    const maps = getMapsApi()
    if (!geocoder.current || !maps) return

    setInput(description)
    setShowDropdown(false)
    setIsLoading(true)

    try {
      // Get place details (coordinates and address components)
      const result = await geocoder.current.geocode({ placeId })

      const place = result?.results?.[0]
      const location = place?.geometry?.location

      if (place && location) {

        // Extract address components
        let locality = ''
        let city = ''
        let pincode = ''

        place.address_components.forEach((component: GeocodeResult['address_components'][number]) => {
          const types = component.types
          if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
            locality = component.long_name
          }
          if (types.includes('locality')) {
            city = component.long_name
          }
          if (types.includes('postal_code')) {
            pincode = component.long_name
          }
        })

        // Call the callback with place data
        onPlaceSelect({
          lat: location.lat(),
          lng: location.lng(),
          address: place.formatted_address,
          locality,
          city,
          pincode
        })

        // Create new session token for next search
        sessionToken.current = maps.places
          ? new maps.places.AutocompleteSessionToken()
          : null
      }
    } catch (error) {
      console.error('Error getting place details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-11 py-3.5 text-base text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 animate-spin" />
        )}
      </div>

            {/* Predictions Dropdown - Mobile Optimized */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-300 max-h-[60vh] overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelectPlace(prediction.place_id, prediction.description)}
              className="w-full px-4 py-4 text-left hover:bg-green-50 active:bg-green-100 transition-colors flex items-start gap-3 border-b-2 border-gray-200 last:border-0"
            >
              <MapPin className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 mb-1">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-sm text-gray-600">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Powered by Google (required by Terms of Service) */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 px-2 py-1 text-right">
          <Image
            src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png"
            alt="Powered by Google"
            width={120}
            height={16}
            className="h-4 inline-block w-auto"
          />
        </div>
      )}
    </div>
  )
}
