import { Injectable, CanActivate, ExecutionContext, Logger, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

// Metadata key for optional tenant
export const TENANT_OPTIONAL_KEY = 'tenantOptional';
export const TenantOptional = () => SetMetadata(TENANT_OPTIONAL_KEY, true);

// Extend Express Request to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        settings?: Record<string, any>;
      };
    }
  }
}

/**
 * Tenant Context Guard
 * 
 * Extracts tenant information from request headers or query parameters.
 * Sets request.tenant for use in controllers and services.
 * 
 * Supported headers:
 * - X-Tenant-ID: Tenant identifier
 * - X-Tenant-Key: API key for tenant authentication (future)
 * 
 * Supported query parameters:
 * - tenant_id: Fallback for header
 * 
 * Usage:
 * @UseGuards(TenantContextGuard)
 * @Controller('api')
 * export class ApiController { ... }
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  private readonly logger = new Logger(TenantContextGuard.name);
  private tenantCache: Map<string, { id: string; name: string; settings?: Record<string, any>; cachedAt: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Check if tenant is optional for this route
    const isOptional = this.reflector.getAllAndOverride<boolean>(TENANT_OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get tenant ID from header or query
    const tenantId = (request.headers['x-tenant-id'] as string) || 
                     (request.query['tenant_id'] as string) ||
                     'default'; // Default tenant for backwards compatibility

    // Try to get from cache
    const cached = this.tenantCache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      request.tenant = {
        id: cached.id,
        name: cached.name,
        settings: cached.settings,
      };
      return true;
    }

    // For now, set tenant directly without database lookup
    // This allows the guard to work without requiring TenantService injection
    // which would create a circular dependency in some cases
    const tenantData = {
      id: tenantId,
      name: tenantId === 'default' ? 'Default Tenant' : tenantId,
      settings: {},
      cachedAt: Date.now(),
    };
    
    this.tenantCache.set(tenantId, tenantData);
    request.tenant = {
      id: tenantData.id,
      name: tenantData.name,
      settings: tenantData.settings,
    };

    this.logger.debug(`Tenant context set: ${tenantData.name} (${tenantData.id})`);
    return true;
  }
}

/**
 * Tenant decorator for extracting tenant from request
 * 
 * Usage:
 * @Get('data')
 * async getData(@Tenant() tenant: TenantContext) {
 *   // tenant.id, tenant.name, tenant.settings
 * }
 */
export interface TenantContext {
  id: string;
  name: string;
  settings?: Record<string, any>;
}

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.tenant || { id: 'default', name: 'Default Tenant', settings: {} };
  },
);
