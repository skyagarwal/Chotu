/**
 * Normalize phone number to international format (+91XXXXXXXXXX)
 * Handles Indian phone numbers
 */
export function normalizePhoneNumber(input: string): string | null {
  // Clean phone number - remove spaces, dashes, parentheses
  let phone = input.trim().replace(/[\s\-\(\)]/g, '');
  
  // Remove + if present for normalization
  phone = phone.replace(/^\+/, '');
  
  // Indian phone number normalization logic
  // If 10 digits, assume India and add +91
  if (/^\d{10}$/.test(phone)) {
    return '+91' + phone;
  }
  // If 12 digits starting with 91, add +
  else if (/^91\d{10}$/.test(phone)) {
    return '+' + phone;
  }
  // If already has country code with +, keep it
  else if (/^\d{11,15}$/.test(phone)) {
    return '+' + phone;
  }
  // If it doesn't match any pattern, add + anyway
  else if (/^\d+$/.test(phone) && !phone.startsWith('+')) {
    return '+' + phone;
  }
  
  // Final validation - must be + followed by 10-15 digits
  if (/^\+\d{10,15}$/.test('+' + phone.replace(/^\+/, ''))) {
    return '+' + phone.replace(/^\+/, '');
  }
  
  return null; // Invalid phone number
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Format price to Indian currency
 */
export function formatPrice(amount: number): string {
  return '₹' + amount.toFixed(2);
}

/**
 * Calculate distance between two coordinates (in km)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 100) / 100;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
