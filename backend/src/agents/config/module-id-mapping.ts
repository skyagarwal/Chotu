/**
 * Module ID Mapping Configuration
 * 
 * Maps MySQL database module IDs to module types and agents.
 * Database: one_mangwale @ 103.160.107.41:3306
 * 
 * This is the SINGLE SOURCE OF TRUTH for module ID mappings.
 */

/**
 * Module ID to Type Mapping (from MySQL modules table)
 */
export const MODULE_ID_TO_TYPE: Record<number, string> = {
  // GROCERY modules
  1: 'grocery',   // Demo Module
  2: 'grocery',   // Grocery (PRIMARY) - zones: 5,1,2
  17: 'grocery',  // Fruits & Vegetables
  18: 'grocery',  // Local Dukan - zone: 4
  
  // FOOD modules
  4: 'food',      // Food (PRIMARY) - zones: 7,4,2
  6: 'food',      // Tiffin's - zone: 2
  11: 'food',     // Cake & Fragile Delivery
  15: 'food',     // dessert product
  
  // PHARMACY modules
  8: 'pharmacy',  // 24 घंटे (PRIMARY) - zone: 2
  
  // ECOMMERCE modules
  5: 'ecom',      // Shop (PRIMARY) - zones: 4,12,1,2
  7: 'ecom',      // Ecommerce - zone: 2
  9: 'ecom',      // Quick Delivery - zone: 3
  12: 'ecom',     // Chicken/Fish
  13: 'ecom',     // Pet Care
  16: 'ecom',     // Local Kirana - zones: 8,7
  
  // PARCEL modules
  3: 'parcel',    // Local Delivery (PRIMARY) - zones: 7,4,2
  10: 'parcel',   // Fragile Delivery
  14: 'parcel',   // Ambulance
  20: 'parcel',   // Taxi - zone: 4
};

/**
 * Type to Primary Module ID Mapping
 * Use these IDs when you need a representative module ID for a type
 */
export const PRIMARY_MODULE_IDS: Record<string, number> = {
  grocery: 2,    // Grocery
  food: 4,       // Food
  pharmacy: 8,   // 24 घंटे
  ecom: 5,       // Shop
  parcel: 3,     // Local Delivery
  ride: 20,      // Taxi
};

/**
 * Type to All Module IDs Mapping
 * Use when you need to query all modules of a specific type
 */
export const TYPE_TO_MODULE_IDS: Record<string, number[]> = {
  grocery: [1, 2, 17, 18],
  food: [4, 6, 11, 15],
  pharmacy: [8],
  ecom: [5, 7, 9, 12, 13, 16],
  parcel: [3, 10, 14, 20],
};

/**
 * Module Names (for display purposes)
 */
export const MODULE_NAMES: Record<number, string> = {
  1: 'Demo Module',
  2: 'Grocery',
  3: 'Local Delivery',
  4: 'Food',
  5: 'Shop',
  6: "Tiffin's",
  7: 'Ecommerce',
  8: '24 घंटे',
  9: 'Quick Delivery',
  10: 'Fragile Delivery',
  11: 'Cake & Fragile Delivery',
  12: 'Chicken/ Fish',
  13: 'Pet Care',
  14: 'Ambulance',
  15: 'dessert product',
  16: 'Local Kirana',
  17: 'Fruits & Vegetables',
  18: 'Local Dukan',
  20: 'Taxi',
};

/**
 * Get module type from module ID
 * @param moduleId - Database module ID (1-20)
 * @returns Module type string (grocery, food, pharmacy, ecom, parcel)
 */
export function getModuleTypeById(moduleId: number): string {
  return MODULE_ID_TO_TYPE[moduleId] || 'ecom'; // Default to ecom if unknown
}

/**
 * Get primary module ID for a type
 * @param moduleType - Type string (grocery, food, etc.)
 * @returns Primary module ID for that type
 */
export function getPrimaryModuleId(moduleType: string): number {
  return PRIMARY_MODULE_IDS[moduleType] || 5; // Default to Shop (ecom)
}

/**
 * Get all module IDs for a type
 * @param moduleType - Type string (grocery, food, etc.)
 * @returns Array of all module IDs of that type
 */
export function getModuleIdsByType(moduleType: string): number[] {
  return TYPE_TO_MODULE_IDS[moduleType] || [];
}

/**
 * Get module name for display
 * @param moduleId - Database module ID
 * @returns Human-readable module name
 */
export function getModuleName(moduleId: number): string {
  return MODULE_NAMES[moduleId] || `Module ${moduleId}`;
}

/**
 * Check if module ID is valid
 * @param moduleId - Database module ID to check
 * @returns true if module ID exists in database
 */
export function isValidModuleId(moduleId: number): boolean {
  return moduleId in MODULE_ID_TO_TYPE;
}

/**
 * Get module type and name info
 * @param moduleId - Database module ID
 * @returns Object with type and name
 */
export function getModuleInfo(moduleId: number): { type: string; name: string; primary: boolean } {
  const type = getModuleTypeById(moduleId);
  const name = getModuleName(moduleId);
  const primary = getPrimaryModuleId(type) === moduleId;
  
  return { type, name, primary };
}
