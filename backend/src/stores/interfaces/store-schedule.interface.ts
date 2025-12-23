/**
 * Store Schedule Interface
 * 
 * Represents store opening/closing hours from MySQL store_schedule table
 */

export interface StoreSchedule {
  store_id: number;
  day: number;  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  opening_time: string;  // "HH:mm:ss" format
  closing_time: string;  // "HH:mm:ss" format
}

export interface StoreOpenStatus {
  is_open: boolean;
  message: string;
  opens_at?: string;  // If closed, when it opens
  closes_at?: string;  // If open, when it closes
  next_open?: Date;   // Next opening time (for overnight stores)
}

export interface EnrichedStoreSchedule extends StoreSchedule {
  is_currently_open: boolean;
  status_message: string;
  time_until_change?: number;  // Minutes until status changes
}
