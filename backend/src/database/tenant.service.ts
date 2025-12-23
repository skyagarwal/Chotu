import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface TenantData {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  features?: string[];
  settings?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant Service
 * 
 * Manages multi-tenant operations and configuration.
 */
@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private tenantCache: Map<string, { data: TenantData; cachedAt: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get tenant by ID
   */
  async getTenant(id: string): Promise<TenantData | null> {
    // Check cache
    const cached = this.tenantCache.get(id);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const tenant = await this.prisma.$queryRaw<TenantData[]>`
        SELECT id, name, domain, logo, primary_color as "primaryColor",
               features, settings, is_active as "isActive",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM tenants
        WHERE id = ${id}
      `;

      if (tenant && tenant.length > 0) {
        const tenantData = tenant[0];
        this.tenantCache.set(id, { data: tenantData, cachedAt: Date.now() });
        return tenantData;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting tenant ${id}: ${error.message}`);
      return null;
    }
  }

  /**
   * List all active tenants
   */
  async listTenants(): Promise<TenantData[]> {
    try {
      const tenants = await this.prisma.$queryRaw<TenantData[]>`
        SELECT id, name, domain, logo, primary_color as "primaryColor",
               features, settings, is_active as "isActive",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM tenants
        WHERE is_active = true
        ORDER BY name ASC
      `;

      return tenants;
    } catch (error) {
      this.logger.error(`Error listing tenants: ${error.message}`);
      return [];
    }
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: {
    id: string;
    name: string;
    domain?: string;
    logo?: string;
    primaryColor?: string;
    features?: string[];
    settings?: Record<string, any>;
  }): Promise<TenantData> {
    const tenant = await this.prisma.$queryRaw<TenantData[]>`
      INSERT INTO tenants (id, name, domain, logo, primary_color, features, settings)
      VALUES (${data.id}, ${data.name}, ${data.domain || null}, ${data.logo || null},
              ${data.primaryColor || '#10b981'}, ${JSON.stringify(data.features || ['ai', 'vision', 'search'])}::jsonb,
              ${JSON.stringify(data.settings || {})}::jsonb)
      RETURNING id, name, domain, logo, primary_color as "primaryColor",
                features, settings, is_active as "isActive",
                created_at as "createdAt", updated_at as "updatedAt"
    `;

    this.logger.log(`Created tenant: ${data.name} (${data.id})`);
    return tenant[0];
  }

  /**
   * Update tenant settings
   */
  async updateTenant(id: string, data: Partial<TenantData>): Promise<TenantData | null> {
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = $' + (values.length + 2));
      values.push(data.name);
    }
    if (data.domain !== undefined) {
      updates.push('domain = $' + (values.length + 2));
      values.push(data.domain);
    }
    if (data.logo !== undefined) {
      updates.push('logo = $' + (values.length + 2));
      values.push(data.logo);
    }
    if (data.primaryColor !== undefined) {
      updates.push('primary_color = $' + (values.length + 2));
      values.push(data.primaryColor);
    }
    if (data.features !== undefined) {
      updates.push('features = $' + (values.length + 2) + '::jsonb');
      values.push(JSON.stringify(data.features));
    }
    if (data.settings !== undefined) {
      updates.push('settings = $' + (values.length + 2) + '::jsonb');
      values.push(JSON.stringify(data.settings));
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = $' + (values.length + 2));
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      return this.getTenant(id);
    }

    updates.push('updated_at = NOW()');

    try {
      const tenant = await this.prisma.$queryRawUnsafe<TenantData[]>(
        `UPDATE tenants SET ${updates.join(', ')}
         WHERE id = $1
         RETURNING id, name, domain, logo, primary_color as "primaryColor",
                   features, settings, is_active as "isActive",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        id,
        ...values,
      );

      // Invalidate cache
      this.tenantCache.delete(id);

      this.logger.log(`Updated tenant: ${id}`);
      return tenant[0] || null;
    } catch (error) {
      this.logger.error(`Error updating tenant ${id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get tenant setting value
   */
  async getTenantSetting<T = any>(tenantId: string, key: string, defaultValue?: T): Promise<T | undefined> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant || !tenant.settings) {
      return defaultValue;
    }

    const value = (tenant.settings as Record<string, any>)[key];
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Update tenant setting
   */
  async setTenantSetting(tenantId: string, key: string, value: any): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const settings = { ...(tenant.settings || {}), [key]: value };
    await this.updateTenant(tenantId, { settings });
  }

  /**
   * Check if tenant has feature enabled
   */
  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant || !tenant.features) {
      return false;
    }

    const features = Array.isArray(tenant.features) ? tenant.features : [];
    return features.includes(feature);
  }

  /**
   * Clear tenant cache (useful after updates)
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.tenantCache.delete(tenantId);
    } else {
      this.tenantCache.clear();
    }
  }
}
