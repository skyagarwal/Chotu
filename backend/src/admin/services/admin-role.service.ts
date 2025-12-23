/**
 * Role-Based Access Control Service
 * 
 * Handles admin roles and permissions
 */

import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  REVIEWER = 'reviewer',    // For training data review
  VIEWER = 'viewer'
}

export interface AdminPermission {
  module: string;
  actions: ('view' | 'create' | 'edit' | 'delete' | 'execute')[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

// Permission matrix by role
const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: [
    { module: '*', actions: ['view', 'create', 'edit', 'delete', 'execute'] }
  ],
  [AdminRole.ADMIN]: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'models', actions: ['view', 'create', 'edit'] },
    { module: 'agents', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'training', actions: ['view', 'create', 'edit', 'delete', 'execute'] },
    { module: 'learning', actions: ['view', 'create', 'edit', 'execute'] },
    { module: 'scraper', actions: ['view', 'execute'] },
    { module: 'data_sources', actions: ['view', 'create', 'edit'] },
    { module: 'users', actions: ['view'] },
    { module: 'analytics', actions: ['view'] },
    { module: 'settings', actions: ['view', 'edit'] },
  ],
  [AdminRole.MANAGER]: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'agents', actions: ['view', 'edit'] },
    { module: 'training', actions: ['view', 'create', 'edit'] },
    { module: 'learning', actions: ['view', 'edit'] },
    { module: 'analytics', actions: ['view'] },
    { module: 'users', actions: ['view'] },
  ],
  [AdminRole.REVIEWER]: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'training', actions: ['view', 'edit', 'execute'] },
    { module: 'learning', actions: ['view', 'edit'] },
    { module: 'analytics', actions: ['view'] },
  ],
  [AdminRole.VIEWER]: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'analytics', actions: ['view'] },
  ],
};

@Injectable()
export class AdminRoleService {
  private readonly logger = new Logger(AdminRoleService.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET') || 'mangwale-admin-secret';
  }

  /**
   * Create admin user
   */
  async createAdminUser(
    email: string,
    password: string,
    name: string,
    role: AdminRole,
    createdBy: string
  ): Promise<AdminUser> {
    // Only super admin can create other super admins
    const creator = await this.getAdminById(createdBy);
    if (role === AdminRole.SUPER_ADMIN && creator?.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admin can create other super admins');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO admin_users (email, password_hash, name, role, is_active, created_by, created_at)
      VALUES (${email}, ${hashedPassword}, ${name}, ${role}, true, ${createdBy}, NOW())
      RETURNING id, email, name, role, is_active, created_at
    `;

    const user = result[0];
    this.logger.log(`Admin user created: ${email} with role ${role}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AdminRole,
      permissions: this.getPermissionsForRole(user.role),
      isActive: user.is_active,
      createdAt: user.created_at,
    };
  }

  /**
   * Authenticate admin
   */
  async authenticate(email: string, password: string): Promise<{
    user: AdminUser;
    token: string;
  }> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM admin_users WHERE email = ${email} AND is_active = true
    `;

    if (result.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.$executeRaw`
      UPDATE admin_users SET last_login_at = NOW() WHERE id = ${user.id}
    `;

    const adminUser: AdminUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AdminRole,
      permissions: this.getPermissionsForRole(user.role),
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLoginAt: new Date(),
    };

    const token = this.generateToken(adminUser);
    this.logger.log(`Admin logged in: ${email}`);

    return { user: adminUser, token };
  }

  /**
   * Verify token
   */
  verifyToken(token: string): AdminUser | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        permissions: this.getPermissionsForRole(decoded.role),
        isActive: true,
        createdAt: new Date(decoded.createdAt),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if admin has permission
   */
  hasPermission(user: AdminUser, module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'execute'): boolean {
    // Super admin has all permissions
    if (user.role === AdminRole.SUPER_ADMIN) return true;

    const permissions = this.getPermissionsForRole(user.role);
    
    for (const perm of permissions) {
      if (perm.module === '*' || perm.module === module) {
        if (perm.actions.includes(action)) return true;
      }
    }

    return false;
  }

  /**
   * Get permissions for role
   */
  getPermissionsForRole(role: AdminRole): AdminPermission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Get admin by ID
   */
  async getAdminById(id: string): Promise<AdminUser | null> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM admin_users WHERE id = ${id}::uuid
    `;

    if (result.length === 0) return null;

    const user = result[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AdminRole,
      permissions: this.getPermissionsForRole(user.role),
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    };
  }

  /**
   * List all admins
   */
  async listAdmins(): Promise<AdminUser[]> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT id, email, name, role, is_active, created_at, last_login_at 
      FROM admin_users 
      ORDER BY created_at DESC
    `;

    return result.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AdminRole,
      permissions: this.getPermissionsForRole(user.role),
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    }));
  }

  /**
   * Update admin role
   */
  async updateRole(adminId: string, newRole: AdminRole, updatedBy: string): Promise<void> {
    const updater = await this.getAdminById(updatedBy);
    
    if (updater?.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admin can change roles');
    }

    await this.prisma.$executeRaw`
      UPDATE admin_users SET role = ${newRole} WHERE id = ${adminId}::uuid
    `;

    this.logger.log(`Admin ${adminId} role updated to ${newRole} by ${updatedBy}`);
  }

  /**
   * Deactivate admin
   */
  async deactivateAdmin(adminId: string, deactivatedBy: string): Promise<void> {
    const deactivator = await this.getAdminById(deactivatedBy);
    
    if (deactivator?.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admin can deactivate admins');
    }

    await this.prisma.$executeRaw`
      UPDATE admin_users SET is_active = false WHERE id = ${adminId}::uuid
    `;

    this.logger.log(`Admin ${adminId} deactivated by ${deactivatedBy}`);
  }

  private generateToken(user: AdminUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );
  }
}
