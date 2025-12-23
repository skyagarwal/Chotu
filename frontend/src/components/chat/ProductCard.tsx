import { Star } from 'lucide-react'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import type { ProductCard as ProductCardType, VariantOption } from '@/types/chat'

// S3 base URL for product images (primary - more reliable)
const S3_BASE_URL = 'https://s3.ap-south-1.amazonaws.com/mangwale/product';
// CDN as fallback (currently has SSL issues)
const CDN_BASE_URL = 'https://storage.mangwale.ai/mangwale/product';

// Food emoji mapping based on item name/category
const FOOD_EMOJIS: Record<string, string> = {
  pizza: '🍕',
  burger: '🍔',
  biryani: '🍚',
  rice: '🍚',
  paratha: '🫓',
  roti: '🫓',
  naan: '🫓',
  dosa: '🥞',
  idli: '🥟',
  samosa: '🥟',
  momos: '🥟',
  thali: '🍱',
  paneer: '🧀',
  chicken: '🍗',
  mutton: '🍖',
  fish: '🐟',
  prawn: '🦐',
  dal: '🥣',
  soup: '🍲',
  noodles: '🍜',
  pasta: '🍝',
  sandwich: '🥪',
  wrap: '🌯',
  roll: '🌯',
  salad: '🥗',
  ice_cream: '🍨',
  dessert: '🍰',
  cake: '🎂',
  sweet: '🍬',
  juice: '🧃',
  lassi: '🥛',
  coffee: '☕',
  tea: '🍵',
  chai: '🍵',
  shake: '🥤',
  drink: '🥤',
  fries: '🍟',
  veg: '🥬',
  default: '🍽️',
};

/**
 * Get appropriate food emoji based on item name
 */
function getFoodEmoji(name: string): string {
  const lowerName = name.toLowerCase();
  for (const [key, emoji] of Object.entries(FOOD_EMOJIS)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }
  return FOOD_EMOJIS.default;
}

/**
 * Get the full image URL from various image path formats
 * Handles: full URLs, relative paths, filenames
 */
function getImageUrl(image: string): string {
  if (!image) return '';
  
  // Already a full URL - check if it's the problematic CDN and swap to S3
  if (image.startsWith('http://') || image.startsWith('https://')) {
    // Replace storage.mangwale.ai with S3 (CDN has SSL issues)
    if (image.includes('storage.mangwale.ai')) {
      return image.replace('https://storage.mangwale.ai/mangwale/product', S3_BASE_URL);
    }
    return image;
  }
  
  // Handle relative paths like '/product/2024-12-03-xxx.png'
  if (image.startsWith('/product/')) {
    return `${S3_BASE_URL}${image.replace('/product', '')}`;
  }
  
  // Handle paths like 'product/2024-12-03-xxx.png'
  if (image.startsWith('product/')) {
    return `${S3_BASE_URL}/${image.replace('product/', '')}`;
  }
  
  // Just a filename like '2024-12-03-xxx.png'
  return `${S3_BASE_URL}/${image}`;
}

interface ProductCardProps {
  card: ProductCardType
  onAction: (value: string) => void
  index?: number // For staggered animations
  compact?: boolean // Compact mode for horizontal scroll
  direction?: 'left' | 'right' // Animation direction
}

export function ProductCard({ card, onAction, index = 0, compact = false, direction = 'left' }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  
  // Trigger animation on mount with stagger delay - slide from sides
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 80)
    return () => clearTimeout(timer)
  }, [index])
  
  // Initialize selections with first option of each group
  const [selections, setSelections] = useState<Record<string, VariantOption>>(() => {
    const initial: Record<string, VariantOption> = {}
    if (card.variantGroups) {
      card.variantGroups.forEach(group => {
        if (group.options.length > 0) {
          initial[group.id] = group.options[0]
        }
      })
    }
    return initial
  })

  const handleSelection = (groupId: string, option: VariantOption) => {
    setSelections(prev => ({ ...prev, [groupId]: option }))
  }

  // Calculate current price
  const currentPrice = (() => {
    let price = card.price
    Object.values(selections).forEach(option => {
      if (option.price) price = option.price
    })
    return price
  })()

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 sm:w-4 sm:h-4 ${
              i < Math.floor(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
        <span className="text-xs sm:text-sm font-medium text-gray-700 ml-1">{rating}</span>
      </div>
    )
  }

  // Get food emoji for this item
  const foodEmoji = getFoodEmoji(card.name)

  // Compact card for horizontal scroll - Mobile optimized
  if (compact) {
    return (
      <div 
        className={`
          bg-white rounded-xl shadow-sm hover:shadow-md
          p-2 sm:p-2.5 min-w-[130px] max-w-[150px] sm:min-w-[140px] sm:max-w-[160px] flex-shrink-0
          border border-gray-100 hover:border-orange-400 active:border-orange-500
          transition-all duration-300 ease-out cursor-pointer active:scale-[0.98]
          ${isVisible 
            ? 'opacity-100 translate-x-0' 
            : `opacity-0 ${direction === 'left' ? '-translate-x-8' : 'translate-x-8'}`
          }
        `}
        style={{ transitionDelay: `${index * 60}ms` }}
        onClick={() => onAction(card.action.value)}
      >
        {/* Image */}
        <div className="w-full h-16 sm:h-20 rounded-lg overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 mb-1.5 sm:mb-2">
          {imageError || !card.image ? (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              {foodEmoji}
            </div>
          ) : (
            <Image
              src={getImageUrl(card.image)}
              alt={card.name}
              width={160}
              height={80}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
          )}
        </div>
        {/* Content */}
        <h4 className="font-semibold text-[11px] sm:text-xs text-gray-900 truncate mb-0.5 leading-tight">{card.name}</h4>
        {card.rating !== undefined && card.rating > 0 && (
          <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[9px] sm:text-[10px] text-gray-600">{card.rating}</span>
          </div>
        )}
        {currentPrice && (
          <p className="text-xs sm:text-sm font-bold text-green-600">{currentPrice}</p>
        )}
        <button
          className="w-full mt-1.5 sm:mt-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-[9px] sm:text-[10px] font-semibold py-1 sm:py-1.5 rounded-lg transition-colors"
        >
          {card.action.label.replace('Add to Cart', 'Add').replace('Order Now', 'Order')}
        </button>
      </div>
    )
  }

  return (
    <div 
      className={`
        bg-gradient-to-br from-white to-gray-50 rounded-xl sm:rounded-2xl 
        shadow-md hover:shadow-xl p-3 sm:p-4 
        w-full max-w-[280px] sm:max-w-[320px]
        border border-gray-100 hover:border-green-400 
        transition-all duration-300 ease-out
        ${isVisible 
          ? 'opacity-100 translate-x-0 scale-100' 
          : `opacity-0 ${direction === 'left' ? '-translate-x-12' : 'translate-x-12'} scale-95`
        }
      `}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Left side - Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 sm:mb-2 truncate">{card.name}</h3>
          
          {card.rating !== undefined && card.rating > 0 && (
            <div className="mb-1.5 sm:mb-2">{renderStars(card.rating)}</div>
          )}
          
          {card.deliveryTime && (
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2 sm:mb-3">
              🚚 {card.deliveryTime}
            </p>
          )}

          {currentPrice && (
            <p className="text-lg sm:text-xl font-bold text-green-600 mb-2 sm:mb-3">{currentPrice}</p>
          )}

          {/* Variants - compact for mobile */}
          {card.variantGroups?.map(group => (
            <div key={group.id} className="mb-2 sm:mb-3">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 mb-1 uppercase">{group.name}</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {group.options.map(option => {
                  const isSelected = selections[group.id]?.id === option.id
                  
                  if (group.type === 'color') {
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSelection(group.id, option)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all ${
                          isSelected 
                            ? 'border-green-500 ring-1 ring-green-500 scale-110' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: option.colorCode || option.value }}
                        title={option.label}
                      />
                    )
                  }
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelection(group.id, option)}
                      className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md border transition-all ${
                        isSelected 
                          ? 'bg-green-600 text-white border-green-600' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {card.description && (
            <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 line-clamp-2">
              {card.description}
            </p>
          )}

          <button
            onClick={() => {
              onAction(card.action.value)
            }}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 text-sm active:scale-95"
          >
            {card.action.label}
            <span className="text-base">→</span>
          </button>
        </div>

        {/* Right side - Image with emoji fallback */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 shadow-sm flex items-center justify-center">
            {imageError || !card.image ? (
              <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl animate-bounce-slow">
                {foodEmoji}
              </div>
            ) : (
              <Image
                src={getImageUrl(card.image)}
                alt={card.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
