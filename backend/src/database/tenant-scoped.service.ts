import { Injectable, Logger, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from './prisma.service';

/**
 * Tenant-Scoped Prisma Service
 * 
 * Provides tenant-aware database queries that automatically filter by tenant_id.
 * This service is request-scoped to access the tenant from request context.
 * 
 * Usage:
 * 1. Inject TenantScopedService in your service
 * 2. Use tenantWhere() to add tenant filtering to queries
 * 3. Use validateTenantAccess() to check access rights
 * 
 * Example:
 * ```typescript
 * const flows = await this.prisma.flow.findMany({
 *   where: this.tenantScoped.tenantWhere({
 *     status: 'active',
 *   }),
 * });
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantScopedService {
  private readonly logger = new Logger(TenantScopedService.name);
  private tenantId: string;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly prisma: PrismaService,
  ) {
    // Get tenant from request (set by TenantContextGuard)
    this.tenantId = request.tenant?.id || 'default';
  }

  /**
   * Get current tenant ID
   */
  getCurrentTenantId(): string {
    return this.tenantId;
  }

  /**
   * Add tenant filter to Prisma where clause
   * 
   * @param where - Existing where conditions
   * @param fieldName - Name of tenant field (default: 'tenantId')
   * @returns Where clause with tenant filter
   */
  tenantWhere<T extends object>(where?: T, fieldName: string = 'tenantId'): T & { [key: string]: string } {
    return {
      ...(where || {} as T),
      [fieldName]: this.tenantId,
    } as T & { [key: string]: string };
  }

  /**
   * Validate tenant access to a resource
   * 
   * @param resourceTenantId - Tenant ID of the resource
   * @returns true if current tenant can access the resource
   */
  validateTenantAccess(resourceTenantId: string): boolean {
    // Default tenant has access to everything (for backward compatibility)
    if (this.tenantId === 'default') {
      return true;
    }

    // Resource with 'default' tenant is accessible to all
    if (resourceTenantId === 'default' || resourceTenantId === 'mangwale') {
      return true;
    }

    return this.tenantId === resourceTenantId;
  }

  /**
   * Get tenant-filtered count
   */
  async count(model: string, where?: object): Promise<number> {
    const tenantWhere = this.tenantWhere(where);
    
    switch (model) {
      case 'flow':
        return this.prisma.flow.count({ where: tenantWhere as any });
      case 'flowRun':
        return this.prisma.flowRun.count({ where: tenantWhere as any });
      case 'intentDefinition':
        return this.prisma.intentDefinition.count({ where: tenantWhere as any });
      case 'nluTrainingData':
        return this.prisma.nluTrainingData.count({ where: tenantWhere as any });
      default:
        throw new Error(`Unknown model: ${model}`);
    }
  }

  /**
   * Helper to wrap SQL queries with tenant filter
   */
  addTenantToSql(sql: string, tenantIdColumn: string = 'tenant_id'): string {
    // Find WHERE clause or add one
    const hasWhere = sql.toLowerCase().includes('where');
    const tenantCondition = `${tenantIdColumn} = '${this.tenantId}'`;

    if (hasWhere) {
      return sql.replace(/where/i, `WHERE ${tenantCondition} AND`);
    } else {
      // Find FROM clause and add WHERE after it
      const fromMatch = sql.match(/(from\s+\w+)/i);
      if (fromMatch) {
        return sql.replace(fromMatch[0], `${fromMatch[0]} WHERE ${tenantCondition}`);
      }
    }

    return sql;
  }
}

/**
 * Static helper functions for tenant filtering
 * Use when you don't have access to request context
 */
export class TenantHelper {
  /**
   * Add tenant filter to a Prisma where clause
   */
  static withTenant<T extends object>(
    where: T | undefined,
    tenantId: string,
    fieldName: string = 'tenantId',
  ): T & { [key: string]: string } {
    return {
      ...(where || {} as T),
      [fieldName]: tenantId,
    } as T & { [key: string]: string };
  }

  /**
   * Check if tenant has access to resource
   */
  static hasAccess(currentTenantId: string, resourceTenantId: string): boolean {
    if (currentTenantId === 'default') return true;
    if (resourceTenantId === 'default' || resourceTenantId === 'mangwale') return true;
    return currentTenantId === resourceTenantId;
  }

  /**
   * Get default tenant ID from request
   */
  static getTenantId(request: Request): string {
    return request.tenant?.id || 
           (request.headers['x-tenant-id'] as string) ||
           (request.query['tenant_id'] as string) ||
           'default';
  }
}
