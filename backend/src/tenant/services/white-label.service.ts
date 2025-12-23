import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

/**
 * 🎨 White-Label Branding Service
 * 
 * Manages per-tenant branding:
 * - Logo and colors
 * - Custom domain mapping
 * - Chat widget styling
 * - Email templates
 * - Custom prompts/tone
 */

export interface TenantBranding {
  tenantId: number;
  brandName: string;
  logo?: {
    url: string;
    darkUrl?: string;
    favicon?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    chatBubble: string;
    chatBubbleUser: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  chatWidget: {
    welcomeMessage: string;
    placeholderText: string;
    position: 'bottom-right' | 'bottom-left';
    buttonStyle: 'round' | 'square';
    showBranding: boolean;
  };
  customDomain?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class WhiteLabelService implements OnModuleInit {
  private readonly logger = new Logger(WhiteLabelService.name);
  private pool: Pool;
  private brandingCache: Map<number, TenantBranding> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.logger.log('🎨 WhiteLabelService initializing...');
  }

  async onModuleInit() {
    const databaseUrl = this.configService.get('DATABASE_URL') ||
      'postgresql://mangwale_config:config_secure_pass_2024@mangwale_postgres:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    try {
      const client = await this.pool.connect();

      await client.query(`
        -- Tenant branding configuration
        CREATE TABLE IF NOT EXISTS tenant_branding (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL UNIQUE,
          brand_name VARCHAR(100) NOT NULL,
          
          -- Logo
          logo_url TEXT,
          logo_dark_url TEXT,
          favicon_url TEXT,
          
          -- Colors (hex codes)
          color_primary VARCHAR(9) DEFAULT '#0066CC',
          color_secondary VARCHAR(9) DEFAULT '#4A90A4',
          color_accent VARCHAR(9) DEFAULT '#FF6B35',
          color_background VARCHAR(9) DEFAULT '#FFFFFF',
          color_text VARCHAR(9) DEFAULT '#333333',
          color_chat_bubble VARCHAR(9) DEFAULT '#E8F4FD',
          color_chat_bubble_user VARCHAR(9) DEFAULT '#0066CC',
          
          -- Fonts
          font_heading VARCHAR(100) DEFAULT 'Inter',
          font_body VARCHAR(100) DEFAULT 'Inter',
          
          -- Chat widget
          welcome_message TEXT DEFAULT 'नमस्ते! कैसे मदद कर सकता हूं?',
          placeholder_text VARCHAR(200) DEFAULT 'Type a message...',
          widget_position VARCHAR(20) DEFAULT 'bottom-right',
          button_style VARCHAR(20) DEFAULT 'round',
          show_branding BOOLEAN DEFAULT true,
          
          -- Custom domain
          custom_domain VARCHAR(255),
          domain_verified BOOLEAN DEFAULT false,
          ssl_certificate TEXT,
          
          -- Metadata
          metadata JSONB DEFAULT '{}',
          
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_branding_tenant ON tenant_branding(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_branding_domain ON tenant_branding(custom_domain) WHERE custom_domain IS NOT NULL;

        -- Email templates per tenant
        CREATE TABLE IF NOT EXISTS tenant_email_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL,
          template_type VARCHAR(50) NOT NULL, -- welcome, order_confirmation, order_status, forgot_password, etc.
          subject VARCHAR(200) NOT NULL,
          body_html TEXT NOT NULL,
          body_text TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, template_type)
        );

        -- Chat widget configuration per tenant
        CREATE TABLE IF NOT EXISTS tenant_chat_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL UNIQUE,
          
          -- Appearance
          widget_title VARCHAR(100) DEFAULT 'Chat with us',
          avatar_url TEXT,
          greeting_delay_ms INTEGER DEFAULT 1000,
          typing_indicator_delay_ms INTEGER DEFAULT 500,
          
          -- Behavior
          auto_open_on_load BOOLEAN DEFAULT false,
          auto_open_delay_ms INTEGER DEFAULT 5000,
          persist_conversation BOOLEAN DEFAULT true,
          show_timestamps BOOLEAN DEFAULT true,
          enable_attachments BOOLEAN DEFAULT true,
          enable_voice_messages BOOLEAN DEFAULT false,
          
          -- Operating hours
          operating_hours JSONB DEFAULT '{"enabled": false}',
          offline_message TEXT DEFAULT 'We are currently offline. Please leave a message.',
          
          -- Pre-chat form
          pre_chat_form JSONB DEFAULT '{"enabled": false}',
          
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      client.release();
      this.logger.log('✅ WhiteLabelService initialized');
    } catch (error: any) {
      this.logger.error(`❌ Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Get tenant branding
   */
  async getBranding(tenantId: number): Promise<TenantBranding | null> {
    // Check cache
    if (this.brandingCache.has(tenantId)) {
      return this.brandingCache.get(tenantId)!;
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM tenant_branding WHERE tenant_id = $1`,
        [tenantId],
      );

      if (result.rows.length === 0) {
        return this.getDefaultBranding(tenantId);
      }

      const row = result.rows[0];
      const branding: TenantBranding = {
        tenantId,
        brandName: row.brand_name,
        logo: {
          url: row.logo_url,
          darkUrl: row.logo_dark_url,
          favicon: row.favicon_url,
        },
        colors: {
          primary: row.color_primary,
          secondary: row.color_secondary,
          accent: row.color_accent,
          background: row.color_background,
          text: row.color_text,
          chatBubble: row.color_chat_bubble,
          chatBubbleUser: row.color_chat_bubble_user,
        },
        fonts: {
          heading: row.font_heading,
          body: row.font_body,
        },
        chatWidget: {
          welcomeMessage: row.welcome_message,
          placeholderText: row.placeholder_text,
          position: row.widget_position,
          buttonStyle: row.button_style,
          showBranding: row.show_branding,
        },
        customDomain: row.custom_domain,
        metadata: row.metadata,
      };

      // Cache for 5 minutes
      this.brandingCache.set(tenantId, branding);
      setTimeout(() => this.brandingCache.delete(tenantId), 300000);

      return branding;
    } catch (error: any) {
      this.logger.error(`Failed to get branding: ${error.message}`);
      return this.getDefaultBranding(tenantId);
    }
  }

  /**
   * Get default branding
   */
  private getDefaultBranding(tenantId: number): TenantBranding {
    return {
      tenantId,
      brandName: 'Mangwale',
      logo: {
        url: '/assets/logo.png',
      },
      colors: {
        primary: '#0066CC',
        secondary: '#4A90A4',
        accent: '#FF6B35',
        background: '#FFFFFF',
        text: '#333333',
        chatBubble: '#E8F4FD',
        chatBubbleUser: '#0066CC',
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter',
      },
      chatWidget: {
        welcomeMessage: 'नमस्ते! कैसे मदद कर सकता हूं?',
        placeholderText: 'Type a message...',
        position: 'bottom-right',
        buttonStyle: 'round',
        showBranding: true,
      },
    };
  }

  /**
   * Update tenant branding
   */
  async updateBranding(tenantId: number, updates: Partial<TenantBranding>): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO tenant_branding (tenant_id, brand_name, logo_url, logo_dark_url, favicon_url,
           color_primary, color_secondary, color_accent, color_background, color_text,
           color_chat_bubble, color_chat_bubble_user, font_heading, font_body,
           welcome_message, placeholder_text, widget_position, button_style, show_branding,
           custom_domain, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (tenant_id) DO UPDATE SET
           brand_name = COALESCE($2, tenant_branding.brand_name),
           logo_url = COALESCE($3, tenant_branding.logo_url),
           logo_dark_url = COALESCE($4, tenant_branding.logo_dark_url),
           favicon_url = COALESCE($5, tenant_branding.favicon_url),
           color_primary = COALESCE($6, tenant_branding.color_primary),
           color_secondary = COALESCE($7, tenant_branding.color_secondary),
           color_accent = COALESCE($8, tenant_branding.color_accent),
           color_background = COALESCE($9, tenant_branding.color_background),
           color_text = COALESCE($10, tenant_branding.color_text),
           color_chat_bubble = COALESCE($11, tenant_branding.color_chat_bubble),
           color_chat_bubble_user = COALESCE($12, tenant_branding.color_chat_bubble_user),
           font_heading = COALESCE($13, tenant_branding.font_heading),
           font_body = COALESCE($14, tenant_branding.font_body),
           welcome_message = COALESCE($15, tenant_branding.welcome_message),
           placeholder_text = COALESCE($16, tenant_branding.placeholder_text),
           widget_position = COALESCE($17, tenant_branding.widget_position),
           button_style = COALESCE($18, tenant_branding.button_style),
           show_branding = COALESCE($19, tenant_branding.show_branding),
           custom_domain = COALESCE($20, tenant_branding.custom_domain),
           metadata = COALESCE($21, tenant_branding.metadata),
           updated_at = NOW()`,
        [
          tenantId,
          updates.brandName,
          updates.logo?.url,
          updates.logo?.darkUrl,
          updates.logo?.favicon,
          updates.colors?.primary,
          updates.colors?.secondary,
          updates.colors?.accent,
          updates.colors?.background,
          updates.colors?.text,
          updates.colors?.chatBubble,
          updates.colors?.chatBubbleUser,
          updates.fonts?.heading,
          updates.fonts?.body,
          updates.chatWidget?.welcomeMessage,
          updates.chatWidget?.placeholderText,
          updates.chatWidget?.position,
          updates.chatWidget?.buttonStyle,
          updates.chatWidget?.showBranding,
          updates.customDomain,
          updates.metadata ? JSON.stringify(updates.metadata) : null,
        ],
      );

      // Invalidate cache
      this.brandingCache.delete(tenantId);
    } catch (error: any) {
      this.logger.error(`Failed to update branding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get branding by custom domain
   */
  async getBrandingByDomain(domain: string): Promise<TenantBranding | null> {
    try {
      const result = await this.pool.query(
        `SELECT tenant_id FROM tenant_branding WHERE custom_domain = $1 AND domain_verified = true`,
        [domain],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.getBranding(result.rows[0].tenant_id);
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Generate CSS variables for branding
   */
  generateCssVariables(branding: TenantBranding): string {
    return `
:root {
  --brand-primary: ${branding.colors.primary};
  --brand-secondary: ${branding.colors.secondary};
  --brand-accent: ${branding.colors.accent};
  --brand-background: ${branding.colors.background};
  --brand-text: ${branding.colors.text};
  --brand-chat-bubble: ${branding.colors.chatBubble};
  --brand-chat-bubble-user: ${branding.colors.chatBubbleUser};
  --font-heading: '${branding.fonts.heading}', sans-serif;
  --font-body: '${branding.fonts.body}', sans-serif;
}`;
  }

  /**
   * Generate chat widget embed code
   */
  generateWidgetEmbed(tenantId: number): string {
    const baseUrl = this.configService.get('PUBLIC_URL') || 'https://api.mangwale.ai';
    return `<!-- Mangwale Chat Widget -->
<script>
  (function(w, d, s, o, f) {
    w['MangwaleChat'] = o;
    w[o] = w[o] || function() { (w[o].q = w[o].q || []).push(arguments) };
    var js = d.createElement(s); js.async = 1;
    js.src = '${baseUrl}/widget/${tenantId}/chat.js';
    var fjs = d.getElementsByTagName(s)[0];
    fjs.parentNode.insertBefore(js, fjs);
  }(window, document, 'script', 'mangwale'));
  mangwale('init', { tenantId: '${tenantId}' });
</script>
<!-- End Mangwale Chat Widget -->`;
  }
}
