import { Controller, Get, Put, Post, Body, Param, Query } from '@nestjs/common';
import { WhiteLabelService, TenantBranding } from '../services/white-label.service';

/**
 * 🎨 White-Label Admin Controller
 * 
 * Admin endpoints for managing tenant branding:
 * - Logo and color customization
 * - Custom domain configuration
 * - Chat widget settings
 * - Widget embed code generation
 */
@Controller('admin/white-label')
export class WhiteLabelAdminController {
  constructor(private readonly whiteLabelService: WhiteLabelService) {}

  /**
   * Get tenant branding
   */
  @Get(':tenantId')
  async getBranding(@Param('tenantId') tenantId: string) {
    const branding = await this.whiteLabelService.getBranding(parseInt(tenantId));
    return { success: true, data: branding };
  }

  /**
   * Update tenant branding
   */
  @Put(':tenantId')
  async updateBranding(
    @Param('tenantId') tenantId: string,
    @Body() updates: Partial<TenantBranding>,
  ) {
    await this.whiteLabelService.updateBranding(parseInt(tenantId), updates);
    const updated = await this.whiteLabelService.getBranding(parseInt(tenantId));
    return { success: true, data: updated };
  }

  /**
   * Update colors only
   */
  @Put(':tenantId/colors')
  async updateColors(
    @Param('tenantId') tenantId: string,
    @Body() colors: TenantBranding['colors'],
  ) {
    await this.whiteLabelService.updateBranding(parseInt(tenantId), { colors });
    return { success: true };
  }

  /**
   * Update logo only
   */
  @Put(':tenantId/logo')
  async updateLogo(
    @Param('tenantId') tenantId: string,
    @Body() logo: TenantBranding['logo'],
  ) {
    await this.whiteLabelService.updateBranding(parseInt(tenantId), { logo });
    return { success: true };
  }

  /**
   * Update chat widget settings
   */
  @Put(':tenantId/chat-widget')
  async updateChatWidget(
    @Param('tenantId') tenantId: string,
    @Body() chatWidget: TenantBranding['chatWidget'],
  ) {
    await this.whiteLabelService.updateBranding(parseInt(tenantId), { chatWidget });
    return { success: true };
  }

  /**
   * Set custom domain
   */
  @Post(':tenantId/domain')
  async setCustomDomain(
    @Param('tenantId') tenantId: string,
    @Body() body: { domain: string },
  ) {
    await this.whiteLabelService.updateBranding(parseInt(tenantId), { 
      customDomain: body.domain 
    });
    
    // Return DNS verification instructions
    return {
      success: true,
      message: 'Domain configured. Please add the following DNS records:',
      dnsRecords: [
        {
          type: 'CNAME',
          name: body.domain,
          value: 'chat.mangwale.ai',
        },
        {
          type: 'TXT',
          name: `_mangwale.${body.domain}`,
          value: `tenant=${tenantId}`,
        },
      ],
    };
  }

  /**
   * Get CSS variables
   */
  @Get(':tenantId/css')
  async getCssVariables(@Param('tenantId') tenantId: string) {
    const branding = await this.whiteLabelService.getBranding(parseInt(tenantId));
    if (!branding) {
      return { success: false, error: 'Branding not found' };
    }

    const css = this.whiteLabelService.generateCssVariables(branding);
    return { success: true, css };
  }

  /**
   * Get widget embed code
   */
  @Get(':tenantId/embed-code')
  async getEmbedCode(@Param('tenantId') tenantId: string) {
    const embedCode = this.whiteLabelService.generateWidgetEmbed(parseInt(tenantId));
    return { success: true, embedCode };
  }

  /**
   * Preview branding (temporary)
   */
  @Post(':tenantId/preview')
  async previewBranding(
    @Param('tenantId') tenantId: string,
    @Body() branding: Partial<TenantBranding>,
  ) {
    // Generate preview without saving
    const current = await this.whiteLabelService.getBranding(parseInt(tenantId));
    const merged: TenantBranding = {
      ...current!,
      ...branding,
      colors: { ...current!.colors, ...branding.colors },
      fonts: { ...current!.fonts, ...branding.fonts },
      chatWidget: { ...current!.chatWidget, ...branding.chatWidget },
    };

    return {
      success: true,
      preview: merged,
      css: this.whiteLabelService.generateCssVariables(merged),
    };
  }
}
