import { Controller, Get, Post, Put, Delete, Body, Param, Logger, Query } from '@nestjs/common';
import { TenantService, TenantData } from './tenant.service';

/**
 * Tenant Admin Controller
 * 
 * Manages multi-tenant configuration from admin panel.
 */
@Controller('tenants')
export class TenantController {
  private readonly logger = new Logger(TenantController.name);

  constructor(private readonly tenantService: TenantService) {}

  /**
   * List all tenants
   */
  @Get()
  async listTenants(): Promise<TenantData[]> {
    return this.tenantService.listTenants();
  }

  /**
   * Get tenant by ID
   */
  @Get(':id')
  async getTenant(@Param('id') id: string): Promise<TenantData | null> {
    return this.tenantService.getTenant(id);
  }

  /**
   * Create new tenant
   */
  @Post()
  async createTenant(
    @Body() body: {
      id: string;
      name: string;
      domain?: string;
      logo?: string;
      primaryColor?: string;
      features?: string[];
      settings?: Record<string, any>;
    },
  ): Promise<TenantData> {
    this.logger.log(`Creating tenant: ${body.name} (${body.id})`);
    return this.tenantService.createTenant(body);
  }

  /**
   * Update tenant
   */
  @Put(':id')
  async updateTenant(
    @Param('id') id: string,
    @Body() body: Partial<TenantData>,
  ): Promise<TenantData | null> {
    this.logger.log(`Updating tenant: ${id}`);
    return this.tenantService.updateTenant(id, body);
  }

  /**
   * Get tenant setting
   */
  @Get(':id/settings/:key')
  async getTenantSetting(
    @Param('id') id: string,
    @Param('key') key: string,
    @Query('default') defaultValue?: string,
  ): Promise<{ key: string; value: any }> {
    const value = await this.tenantService.getTenantSetting(
      id,
      key,
      defaultValue ? JSON.parse(defaultValue) : undefined,
    );
    return { key, value };
  }

  /**
   * Update tenant setting
   */
  @Put(':id/settings/:key')
  async setTenantSetting(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body('value') value: any,
  ): Promise<{ success: boolean }> {
    await this.tenantService.setTenantSetting(id, key, value);
    return { success: true };
  }

  /**
   * Check if tenant has feature
   */
  @Get(':id/features/:feature')
  async hasFeature(
    @Param('id') id: string,
    @Param('feature') feature: string,
  ): Promise<{ feature: string; enabled: boolean }> {
    const enabled = await this.tenantService.hasFeature(id, feature);
    return { feature, enabled };
  }

  /**
   * Clear tenant cache
   */
  @Post(':id/cache/clear')
  async clearCache(@Param('id') id: string): Promise<{ success: boolean }> {
    this.tenantService.clearCache(id);
    return { success: true };
  }
}
