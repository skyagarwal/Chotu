import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Parse numbered options from AI message
export const parseButtonsFromText = (text: string): { cleanText: string; buttons: Array<{ id: string; label: string; value: string }> } => {
  // Match patterns like "1️⃣ Option text" or "1. Option text" or "[BTN|Label|value]"
  const emojiPattern = /(\d)️⃣\s*([^\n]+)/g
  const numberPattern = /^(\d+)\.\s*([^\n]+)/gm
  // Updated: Use | separator to avoid conflicts with colons in labels
  // Format: [BTN|Label text here|value]
  const buttonPattern = /\[BTN\|([^|]+)\|([^\]]+)\]/g
  // Legacy format: [BUTTON:label:value] (for backwards compatibility - value is last segment after :)
  const legacyButtonPattern = /\[BUTTON:\s*(.+?):([^:\]]+)\]/g
  
  const buttons: Array<{ id: string; label: string; value: string }> = []
  let cleanText = text
  
  // Check for new button syntax [BTN|label|value]
  let match
  while ((match = buttonPattern.exec(text)) !== null) {
    const label = match[1].trim()
    const value = match[2].trim()
    buttons.push({
      id: `btn-${buttons.length}`,
      label: label,
      value: value
    })
  }
  
  // Also check legacy format [BUTTON:label:value]
  if (buttons.length === 0) {
    while ((match = legacyButtonPattern.exec(text)) !== null) {
      const label = match[1].trim()
      const value = match[2].trim()
      buttons.push({
        id: `btn-${buttons.length}`,
        label: label,
        value: value
      })
    }
  }
  
  // Remove button markers from text
  cleanText = cleanText.replace(buttonPattern, '').replace(legacyButtonPattern, '').trim()
  
  // Check for emoji-numbered options (1️⃣, 2️⃣)
  if (buttons.length === 0) {
    while ((match = emojiPattern.exec(text)) !== null) {
      const number = match[1]
      const label = match[2].trim().replace(/[📱📘🍔🛒🏨🎬🔧📦🚗❤️]/g, '').trim()
      buttons.push({
        id: `option-${number}`,
        label: label,
        value: number
      })
    }
  }
  
  // Check for regular numbered options (1., 2.)
  if (buttons.length === 0) {
    while ((match = numberPattern.exec(text)) !== null) {
      const number = match[1]
      const label = match[2].trim().replace(/[📱📘🍔🛒🏨🎬🔧📦🚗❤️]/g, '').trim()
      buttons.push({
        id: `option-${number}`,
        label: label,
        value: number
      })
    }
  }
  
  // If we found buttons, clean the text
  if (buttons.length > 0) {
    // Remove the button lines but keep the header
    cleanText = text
      .replace(/(\d)️⃣\s*[^\n]+/g, '')
      .replace(/^\d+\.\s*[^\n]+$/gm, '')
      .replace(/Reply with \d+ or \d+:?/gi, '')
      .replace(/Please choose.*:/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  
  return { cleanText, buttons }
}

// Parse product/restaurant cards from AI message
export const parseCardsFromText = (text: string): { cleanText: string; cards: Array<{ id: string; name: string; image: string; rating?: number; deliveryTime?: string; price?: string; description?: string; action: { label: string; value: string } }> } => {
  const cards: Array<{ id: string; name: string; image: string; rating?: number; deliveryTime?: string; price?: string; description?: string; action: { label: string; value: string } }> = []
  let cleanText = text

  // Pattern for card format:
  // 🍕 Pizza Palace
  // ⭐ 4.5 stars | 🚚 25-30 mins
  // Order Now → order:pizza-palace
  const cardPattern = /([🍕🍔🍜🍱🥘🌮🍛🥗🍝🍖🥙🌯])\s*([^\n]+)\n⭐\s*([\d.]+)\s*stars?\s*\|\s*🚚\s*([^\n]+)\n(?:💰\s*([^\n]+)\n)?(?:([^\n]+)\n)?Order Now\s*→\s*([^\n]+)/gi

  let match
  while ((match = cardPattern.exec(text)) !== null) {
    const emoji = match[1]
    const name = match[2].trim()
    const rating = parseFloat(match[3])
    const deliveryTime = match[4].trim()
    const price = match[5]?.trim()
    const description = match[6]?.trim()
    const actionValue = match[7].trim()

    cards.push({
      id: `card-${cards.length + 1}`,
      name,
      image: emoji, // Use emoji as fallback, backend should provide real image URL
      rating,
      deliveryTime,
      price,
      description,
      action: {
        label: 'Order Now',
        value: actionValue
      }
    })
  }

  // If we found cards, remove them from text
  if (cards.length > 0) {
    cleanText = text.replace(cardPattern, '').replace(/\n{3,}/g, '\n\n').trim()
  }

  return { cleanText, cards }
}
