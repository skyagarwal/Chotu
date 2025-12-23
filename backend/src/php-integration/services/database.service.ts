import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

interface UserByPhone {
  userId: number;
  hasPhoneInUsersTable: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * PhpDatabaseService - Direct MySQL connection to prevent duplicate user creation
 * CRITICAL: This service checks customer_addresses and updates users.phone to prevent duplicates
 */
@Injectable()
export class PhpDatabaseService {
  private readonly logger = new Logger(PhpDatabaseService.name);
  private pool: mysql.Pool;

  constructor(private configService: ConfigService) {
    // Connect to MySQL via environment variables or defaults
    // This service prevents duplicate user creation by checking customer_addresses
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
      this.logger.log(`✅ PhpDatabaseService initialized with MySQL (${host}:${port}/${database})`);
    } catch (error) {
      this.logger.warn(`⚠️ MySQL connection failed - duplicate prevention disabled: ${error.message}`);
      this.pool = null;
    }
  }

  /**
   * Find user by phone number across users.phone and customer_addresses.contact_person_number
   * Checks BOTH phone formats: with and without +91 prefix
   * Returns user_id if found, along with whether phone exists in users table
   */
  async findUserByPhone(phone: string): Promise<UserByPhone | null> {
    // If MySQL pool not initialized, skip database check
    if (!this.pool) {
      this.logger.debug('📍 MySQL not available - skipping database check');
      return null;
    }
    
    try {
      // Normalize phone: remove +, spaces, dashes
      const normalizedPhone = phone.replace(/[\s\-\+]/g, '');
      
      // Create variants to search for
      const phoneVariants = [
        phone,                                    // Original: +919158886329
        normalizedPhone,                          // Without +: 919158886329
        normalizedPhone.replace(/^91/, ''),       // Without country code: 9158886329
      ];
      
      this.logger.log(`🔍 Searching for phone variants: ${phoneVariants.join(', ')}`);
      
      // First check users.phone with all variants  
      // CRITICAL: Only consider phone variants if phone is NOT NULL
      const [usersRows] = await this.pool.query(
        'SELECT id, f_name, l_name, email, phone FROM users WHERE phone IN (?, ?, ?) AND phone IS NOT NULL LIMIT 1',
        phoneVariants
      );

      if (Array.isArray(usersRows) && usersRows.length > 0) {
        const user = usersRows[0] as any;
        this.logger.log(`✅ Found user in users.phone: ID ${user.id} (${user.f_name} ${user.l_name})`);
        return {
          userId: user.id,
          hasPhoneInUsersTable: true,
          firstName: user.f_name,
          lastName: user.l_name,
          email: user.email,
        };
      }

      // Check customer_addresses.contact_person_number with all variants
      const [addressRows] = await this.pool.query(
        'SELECT user_id, contact_person_name FROM customer_addresses WHERE contact_person_number IN (?, ?, ?) ORDER BY id DESC LIMIT 1',
        phoneVariants
      );

      if (Array.isArray(addressRows) && addressRows.length > 0) {
        const address = addressRows[0] as any;
        
        // Get user details
        const [userRows] = await this.pool.query(
          'SELECT id, f_name, l_name, email, phone FROM users WHERE id = ? LIMIT 1',
          [address.user_id]
        );

        if (Array.isArray(userRows) && userRows.length > 0) {
          const user = userRows[0] as any;
          this.logger.log(`✅ Found user in customer_addresses: ID ${user.id} (${user.f_name} ${user.l_name}), phone field is: ${user.phone || 'NULL'}`);
          return {
            userId: user.id,
            hasPhoneInUsersTable: false,  // Phone is NULL in users table
            firstName: user.f_name,
            lastName: user.l_name,
            email: user.email,
          };
        }
      }

      this.logger.log(`❌ No user found for phone: ${phone}`);
      return null;
    } catch (error) {
      this.logger.error(`❌ Database error finding user by phone: ${error.message}`);
      // Don't throw - return null and let the flow continue
      return null;
    }
  }

  /**
   * Update user's phone field in users table
   * CRITICAL: This prevents duplicate user creation by ensuring phone is in users table
   */
  async updateUserPhone(userId: number, phone: string): Promise<void> {
    // If MySQL pool not initialized, skip update
    if (!this.pool) {
      this.logger.debug('📍 MySQL not available - skipping phone update');
      return;
    }
    
    try {
      await this.pool.query(
        'UPDATE users SET phone = ?, updated_at = NOW() WHERE id = ?',
        [phone, userId]
      );
      this.logger.log(`✅ Updated phone for user ID ${userId} to ${phone}`);
    } catch (error) {
      this.logger.error(`❌ Database error updating user phone: ${error.message}`);
      // Don't throw - not critical for the flow
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
