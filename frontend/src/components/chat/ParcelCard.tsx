import { Package, MapPin, Clock, Truck, ArrowRight } from 'lucide-react'
import Image from 'next/image'

interface ParcelCardProps {
  pickup: {
    address: string
    name?: string
    phone?: string
  }
  dropoff: {
    address: string
    name?: string
    phone?: string
  }
  distance?: string
  estimatedTime?: string
  price?: string
  vehicleType?: 'bike' | 'auto' | 'mini-truck' | 'truck'
  status?: 'pending' | 'pickup' | 'in-transit' | 'delivered'
  onAction: (action: string) => void
}

const vehicleIcons: Record<string, string> = {
  'bike': '🏍️',
  'auto': '🛺',
  'mini-truck': '🚐',
  'truck': '🚛'
}

const statusColors: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'pickup': 'bg-blue-100 text-blue-700',
  'in-transit': 'bg-purple-100 text-purple-700',
  'delivered': 'bg-green-100 text-green-700'
}

const statusLabels: Record<string, string> = {
  'pending': 'Awaiting Pickup',
  'pickup': 'Picking Up',
  'in-transit': 'On The Way',
  'delivered': 'Delivered'
}

export function ParcelCard({
  pickup,
  dropoff,
  distance,
  estimatedTime,
  price,
  vehicleType = 'bike',
  status,
  onAction
}: ParcelCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden w-full max-w-[360px]">
      {/* Header - Porter style */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Package className="w-5 h-5" />
          <span className="font-semibold">Parcel Delivery</span>
        </div>
        {status && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        )}
      </div>

      {/* Route visualization */}
      <div className="p-4">
        {/* Pickup */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="w-0.5 h-12 bg-gray-200 my-1" />
          </div>
          <div className="flex-1 pt-1">
            <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Pickup</p>
            <p className="text-sm font-medium text-gray-900 line-clamp-2">{pickup.address}</p>
            {pickup.name && (
              <p className="text-xs text-gray-500 mt-0.5">{pickup.name}</p>
            )}
          </div>
        </div>

        {/* Dropoff */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Drop-off</p>
            <p className="text-sm font-medium text-gray-900 line-clamp-2">{dropoff.address}</p>
            {dropoff.name && (
              <p className="text-xs text-gray-500 mt-0.5">{dropoff.name}</p>
            )}
          </div>
        </div>

        {/* Trip details */}
        <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl p-3">
          <div className="flex items-center gap-4">
            {/* Vehicle type */}
            <div className="text-center">
              <span className="text-2xl">{vehicleIcons[vehicleType]}</span>
              <p className="text-[10px] text-gray-500 capitalize mt-0.5">{vehicleType}</p>
            </div>
            
            {/* Distance */}
            {distance && (
              <div className="text-center border-l pl-4">
                <p className="text-sm font-bold text-gray-900">{distance}</p>
                <p className="text-[10px] text-gray-500">Distance</p>
              </div>
            )}
            
            {/* ETA */}
            {estimatedTime && (
              <div className="text-center border-l pl-4">
                <div className="flex items-center gap-1 justify-center">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <p className="text-sm font-bold text-gray-900">{estimatedTime}</p>
                </div>
                <p className="text-[10px] text-gray-500">Est. Time</p>
              </div>
            )}
          </div>

          {/* Price */}
          {price && (
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">{price}</p>
              <p className="text-[10px] text-gray-500">Total Fare</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-2">
        {!status || status === 'pending' ? (
          <>
            <button
              onClick={() => onAction('edit_parcel')}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Edit Details
            </button>
            <button
              onClick={() => onAction('confirm_parcel')}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
            >
              <span>Confirm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : status === 'in-transit' ? (
          <button
            onClick={() => onAction('track_parcel')}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>Track Delivery</span>
          </button>
        ) : (
          <button
            onClick={() => onAction('new_parcel')}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Book New Parcel
          </button>
        )}
      </div>
    </div>
  )
}
