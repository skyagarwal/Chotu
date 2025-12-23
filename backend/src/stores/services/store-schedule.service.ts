import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';
import {
  StoreSchedule,
  StoreOpenStatus,
  EnrichedStoreSchedule,
} from '../interfaces/store-schedule.interface';

/**
 * Store Schedule Service
 * 
 * Manages store opening/closing hours and availability status
 * Queries MySQL store_schedule table
 */
@Injectable()
export class StoreScheduleService {
  private readonly logger = new Logger(StoreScheduleService.name);
  private pool: mysql.Pool;

  constructor(private configService: ConfigService) {
    // Connect to MySQL for store schedule data
    const host = process.env.PHP_DB_HOST || this.configService.get('php.database.host') || '127.0.0.1';
    const port = parseInt(process.env.PHP_DB_PORT || this.configService.get('php.database.port') || '23306');
    const user = process.env.PHP_DB_USER || 'mangwale_user';
    const password = process.env.PHP_DB_PASSWORD || 'admin123';
    const database = process.env.PHP_DB_NAME || 'mangwale_db';
    
    try {
      this.pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      this.logger.log(`✅ StoreScheduleService initialized with MySQL (${host}:${port}/${database})`);
    } catch (error) {
      this.logger.warn(`⚠️ MySQL connection failed - schedule service disabled: ${error.message}`);
      this.pool = null;
    }
  }

  /**
   * Get store schedule for a specific day
   */
  async getStoreSchedule(
    storeId: number,
    date: Date = new Date(),
  ): Promise<StoreSchedule | null> {
    if (!this.pool) {
      this.logger.warn('MySQL pool not initialized');
      return null;
    }

    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    try {
      const [rows] = await this.pool.query(
        `SELECT store_id, day, opening_time, closing_time 
         FROM store_schedule 
         WHERE store_id = ? AND day = ?`,
        [storeId, dayOfWeek],
      );

      if (!rows || (rows as any[]).length === 0) {
        this.logger.warn(
          `No schedule found for store ${storeId} on day ${dayOfWeek}`,
        );
        return null;
      }

      return (rows as any[])[0];
    } catch (error) {
      this.logger.error(
        `Error fetching schedule for store ${storeId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Get weekly schedule for a store
   */
  async getWeeklySchedule(storeId: number): Promise<StoreSchedule[]> {
    if (!this.pool) {
      return [];
    }

    try {
      const [rows] = await this.pool.query(
        `SELECT store_id, day, opening_time, closing_time 
         FROM store_schedule 
         WHERE store_id = ? 
         ORDER BY day`,
        [storeId],
      );

      return (rows as any[]) || [];
    } catch (error) {
      this.logger.error(
        `Error fetching weekly schedule for store ${storeId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Check if store is currently open
   */
  async isStoreOpen(
    storeId: number,
    currentTime: Date = new Date(),
  ): Promise<StoreOpenStatus> {
    const schedule = await this.getStoreSchedule(storeId, currentTime);

    if (!schedule) {
      // No schedule found - assume open (graceful degradation)
      return {
        is_open: true,
        message: 'Open (schedule unavailable)',
      };
    }

    return this.checkIfOpen(
      schedule.opening_time,
      schedule.closing_time,
      currentTime,
    );
  }

  /**
   * Check if store is open based on opening/closing times
   * Handles overnight stores (e.g., opens 22:00, closes 02:00)
   */
  checkIfOpen(
    opensAt: string,
    closesAt: string,
    currentTime: Date = new Date(),
  ): StoreOpenStatus {
    if (!opensAt || !closesAt) {
      return {
        is_open: true,
        message: 'Open (hours not specified)',
      };
    }

    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Parse opening time
    const [openHour, openMin] = opensAt.split(':').map(Number);
    const openingMinutes = openHour * 60 + openMin;

    // Parse closing time
    const [closeHour, closeMin] = closesAt.split(':').map(Number);
    const closingMinutes = closeHour * 60 + closeMin;

    // Handle overnight stores (closing time < opening time)
    if (closingMinutes < openingMinutes) {
      // Store is open if: current time >= opening OR current time < closing
      const isOpen =
        currentMinutes >= openingMinutes || currentMinutes < closingMinutes;

      if (isOpen) {
        if (currentMinutes >= openingMinutes) {
          // Currently after opening time, closes after midnight
          return {
            is_open: true,
            message: `Open now • Closes at ${this.formatTime(closesAt)} (tomorrow)`,
            closes_at: closesAt,
          };
        } else {
          // Currently before closing time (early morning)
          return {
            is_open: true,
            message: `Open now • Closes at ${this.formatTime(closesAt)}`,
            closes_at: closesAt,
          };
        }
      } else {
        // Closed during the day
        return {
          is_open: false,
          message: `Closed • Opens at ${this.formatTime(opensAt)}`,
          opens_at: opensAt,
        };
      }
    }

    // Normal hours (closing time > opening time)
    const isOpen =
      currentMinutes >= openingMinutes && currentMinutes < closingMinutes;

    if (isOpen) {
      const minutesUntilClose = closingMinutes - currentMinutes;
      const closesSoon = minutesUntilClose <= 30;

      return {
        is_open: true,
        message: closesSoon
          ? `Open now • Closes soon at ${this.formatTime(closesAt)}`
          : `Open now • Closes at ${this.formatTime(closesAt)}`,
        closes_at: closesAt,
      };
    } else {
      // Store is closed
      if (currentMinutes < openingMinutes) {
        // Before opening time today
        return {
          is_open: false,
          message: `Closed • Opens at ${this.formatTime(opensAt)}`,
          opens_at: opensAt,
        };
      } else {
        // After closing time, opens tomorrow
        return {
          is_open: false,
          message: `Closed • Opens at ${this.formatTime(opensAt)} tomorrow`,
          opens_at: opensAt,
        };
      }
    }
  }

  /**
   * Format time string to human-readable format
   * "10:00:00" -> "10:00 AM"
   */
  private formatTime(timeStr: string): string {
    if (!timeStr) return '';

    const [hourStr, minStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minStr, 10);

    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const minFormatted = minute.toString().padStart(2, '0');

    return `${hour12}:${minFormatted} ${ampm}`;
  }

  /**
   * Enrich item results with store open/closed status
   */
  async enrichItemsWithSchedule(items: any[]): Promise<any[]> {
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        if (!item.store_id) return item;

        const status = await this.isStoreOpen(item.store_id);

        return {
          ...item,
          is_open: status.is_open,
          store_status_message: status.message,
          opens_at: status.opens_at,
          closes_at: status.closes_at,
        };
      }),
    );

    return enrichedItems;
  }

  /**
   * Filter items to only include open stores
   */
  async filterOpenStores(items: any[]): Promise<any[]> {
    const enriched = await this.enrichItemsWithSchedule(items);
    return enriched.filter((item) => item.is_open !== false);
  }

  /**
   * Get next 7 days schedule for a store (useful for display)
   */
  async getNextWeekSchedule(storeId: number): Promise<EnrichedStoreSchedule[]> {
    const weekSchedule = await this.getWeeklySchedule(storeId);
    const today = new Date();

    const enrichedSchedule: EnrichedStoreSchedule[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();

      const daySchedule = weekSchedule.find((s) => s.day === dayOfWeek);

      if (daySchedule) {
        const status = this.checkIfOpen(
          daySchedule.opening_time,
          daySchedule.closing_time,
          date,
        );

        enrichedSchedule.push({
          ...daySchedule,
          is_currently_open: status.is_open,
          status_message: status.message,
        });
      }
    }

    return enrichedSchedule;
  }
}
