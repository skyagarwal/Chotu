'use client'

import { Star, Clock, MapPin, Leaf, Zap, TrendingUp, Gift } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import type { ProductCard as ProductCardType, VariantOption } from '@/types/chat'

// Multiple fallback URLs for product images
const IMAGE_SOURCES = [
  'https://new.mangwale.com/storage/product',
  'https://storage.mangwale.ai/mangwale/product',
  'https://mangwale.s3.ap-south-1.amazonaws.com/product',
]

function getImageUrl(image: string): string {
  if (!image) return ''
  // Already a full URL - use as-is
  if (image.startsWith('http://') || image.startsWith('https://')) return image
  // Extract just the filename
  const filename = image.replace(/^(\/)?product\//, '')
  // Use primary source (PHP backend storage)
  return `${IMAGE_SOURCES[0]}/${filename}`
}

function getFallbackEmoji(category?: string, isVeg?: boolean): string {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('pizza')) return '🍕'
  if (cat.includes('burger')) return '🍔'
  if (cat.includes('biryani') || cat.includes('rice')) return '🍚'
  if (cat.includes('noodle') || cat.includes('chinese') || cat.includes('manchurian')) return '🍜'
  if (cat.includes('ice') || cat.includes('cream') || cat.includes('dessert')) return '🍨'
  if (cat.includes('cake') || cat.includes('sweet')) return '🍰'
  if (cat.includes('drink') || cat.includes('juice') || cat.includes('shake')) return '🥤'
  if (cat.includes('coffee')) return '☕'
  if (cat.includes('sandwich') || cat.includes('wrap')) return '🥪'
  if (cat.includes('salad') || cat.includes('healthy')) return '🥗'
  if (cat.includes('chicken') || cat.includes('non-veg')) return '🍗'
  if (cat.includes('fish') || cat.includes('seafood')) return '🐟'
  if (isVeg === true) return '🥘'
  if (isVeg === false) return '🍖'
  return '🍽️'
}

interface CompactProductCardProps {
  card: ProductCardType
  onAction: (value: string) => void
  index?: number
  animationDirection?: 'left' | 'right' | 'top' | 'bottom'
}

export function CompactProductCard({ 
  card, 
  onAction, 
  index = 0,
  animationDirection,
}: CompactProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  
  // Get promotion flags from card data
  const isSponsored = card.isSponsored || false
  const isFeatured = card.isFeatured || false
  
  // Initialize selections
  const [selections, setSelections] = useState<Record<string, VariantOption>>(() => {
    const initial: Record<string, VariantOption> = {}
    if (card.variantGroups) {
      card.variantGroups.forEach(group => {
        if (group.options.length > 0) initial[group.id] = group.options[0]
      })
    }
    return initial
  })

  // Trigger animation on mount
  useState(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 80)
    return () => clearTimeout(timer)
  })

  const currentPrice = (() => {
    let price = card.price
    Object.values(selections).forEach(option => {
      if (option.price) price = option.price
    })
    return price
  })()

  // Animation classes based on direction
  const getAnimationClass = () => {
    if (!isVisible) {
      switch (animationDirection || ['left', 'right', 'top', 'bottom'][index % 4]) {
        case 'left': return 'translate-x-[-100%] opacity-0'
        case 'right': return 'translate-x-[100%] opacity-0'
        case 'top': return 'translate-y-[-50px] opacity-0'
        case 'bottom': return 'translate-y-[50px] opacity-0'
        default: return 'opacity-0 scale-95'
      }
    }
    return 'translate-x-0 translate-y-0 opacity-100 scale-100'
  }

  const rating = card.rating ? Number(card.rating) : null
  const ratingColor = rating ? (rating >= 4 ? 'bg-green-600' : rating >= 3 ? 'bg-yellow-500' : 'bg-orange-500') : ''

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-100 overflow-hidden transition-all duration-500 ease-out ${getAnimationClass()} ${
        isSponsored ? 'ring-2 ring-orange-400 ring-offset-1' : ''
      } ${isFeatured ? 'bg-gradient-to-r from-orange-50 to-white' : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Sponsored/Featured Badge */}
      {(isSponsored || isFeatured) && (
        <div className={`px-2 py-0.5 text-[10px] font-semibold ${
          isSponsored ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-yellow-900'
        }`}>
          {isSponsored ? '⚡ SPONSORED' : '🏆 FEATURED'}
        </div>
      )}

      <div className="flex p-2.5 gap-3">
        {/* Image Section - Compact */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {card.image && !imageError ? (
            <Image
              src={getImageUrl(card.image)}
              alt={card.name || 'Item'}
              fill
              className="object-cover hover:scale-110 transition-transform duration-300"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
              <span className="text-3xl">{getFallbackEmoji(card.category, card.veg)}</span>
            </div>
          )}
          
          {/* Veg indicator */}
          {card.veg !== undefined && (
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-sm border-2 flex items-center justify-center ${
              card.veg ? 'border-green-600 bg-white' : 'border-red-600 bg-white'
            }`}>
              <div className={`w-2 h-2 rounded-full ${card.veg ? 'bg-green-600' : 'bg-red-600'}`} />
            </div>
          )}

          {/* Urgency badge */}
          {card.urgency === 'high' && (
            <div className="absolute bottom-1 left-1 right-1 bg-red-500/90 text-white text-[9px] font-bold text-center py-0.5 rounded">
              🔥 LIMITED
            </div>
          )}

          {/* Discount badge */}
          {card.discount && (
            <div className="absolute top-1 right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              {typeof card.discount === 'number' ? `${card.discount}% OFF` : card.discount}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-1">
                {card.name || 'Unnamed Item'}
              </h3>
              {rating && (
                <div className={`flex items-center gap-0.5 ${ratingColor} text-white px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0`}>
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {rating.toFixed(1)}
                </div>
              )}
            </div>

            {/* Store & Delivery Info */}
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 flex-wrap">
              {card.storeName && (
                <span className="font-medium text-gray-700 truncate max-w-[100px]">{card.storeName}</span>
              )}
              {/* Open/Closed Status */}
              {card.isOpen !== undefined && (
                <>
                  <span>•</span>
                  <span className={`font-medium ${card.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                    {card.isOpen ? '🟢 Open' : '🔴 Closed'}
                  </span>
                </>
              )}
              {/* Distance */}
              {card.distance && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {card.distance}
                  </span>
                </>
              )}
              {card.deliveryTime && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {card.deliveryTime}
                  </span>
                </>
              )}
            </div>

            {/* Social Proof / Persuasion */}
            {(card.socialProof || card.persuasionHint) && (
              <p className="text-[10px] text-orange-600 font-medium mt-1 line-clamp-1">
                {card.socialProof || card.persuasionHint}
              </p>
            )}
          </div>

          {/* Price & Action Row */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-bold text-gray-900">{currentPrice}</span>
            </div>

            <button
              onClick={() => onAction(card.action?.value || `Add ${card.name} to cart`)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center gap-1 ${
                card.urgency === 'high' 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {card.action?.label || 'Add +'}
            </button>
          </div>
        </div>
      </div>

      {/* Deal/Offer Banner */}
      {card.badges && card.badges.length > 0 && (
        <div className="px-2.5 pb-2 flex gap-1.5 flex-wrap">
          {card.badges.slice(0, 2).map((badge, idx) => (
            <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-medium rounded-full">
              <Gift className="w-2.5 h-2.5" />
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Quick Pick Pills Component
interface QuickPicksProps {
  options: Array<{ label: string; value: string; icon?: string }>
  onSelect: (value: string) => void
}

export function QuickPicks({ options, onSelect }: QuickPicksProps) {
  return (
    <div className="flex gap-2 flex-wrap py-2">
      {options.map((option, index) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all duration-200 shadow-sm animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {option.icon && <span>{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Section Header
interface SectionHeaderProps {
  title: string
  icon?: React.ReactNode
  badge?: string
}

export function SectionHeader({ title, icon, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-3">
      {icon}
      <span className="text-sm font-semibold text-gray-700">{title}</span>
      {badge && (
        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full">
          {badge}
        </span>
      )}
    </div>
  )
}
