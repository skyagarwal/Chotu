import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '../../common/enums/platform.enum';

/**
 * 🔀 Channel Variants Service
 * 
 * Adapts flow responses based on channel capabilities:
 * - WhatsApp: Rich media, buttons, lists, location
 * - Telegram: Inline keyboards, photos, documents
 * - SMS: Text only, 160 char segments
 * - Instagram: Quick replies, cards, images
 * - Voice: TTS-friendly text, DTMF menus
 * - Web: Full interactive UI
 * 
 * Each channel has different capabilities:
 * - Button limits (WhatsApp: 3, Telegram: unlimited, SMS: none)
 * - Character limits (SMS: 160, WhatsApp: 4096, Voice: unlimited)
 * - Media support (WhatsApp/Telegram/Instagram: yes, SMS/Voice: no)
 * - Interactive elements (Web: richest, Voice: DTMF only)
 */

export interface ChannelCapabilities {
  maxButtons: number;
  maxCharacters: number;
  supportsMedia: boolean;
  supportsLocation: boolean;
  supportsLists: boolean;
  supportsCards: boolean;
  supportsQuickReplies: boolean;
  supportsRichText: boolean;
  supportsDtmf: boolean;
  buttonStyle: 'inline' | 'reply' | 'quick_reply' | 'none';
}

export interface ChannelAdaptedResponse {
  text: string;
  buttons?: Array<{ id: string; label: string; value: string }>;
  cards?: Array<any>;
  media?: { type: string; url: string };
  locationRequest?: boolean;
  dtmfMenu?: Array<{ digit: string; label: string }>;
  listSections?: Array<{ title: string; items: any[] }>;
}

@Injectable()
export class ChannelVariantsService {
  private readonly logger = new Logger(ChannelVariantsService.name);

  // Channel capabilities mapping
  private readonly capabilities: Record<string, ChannelCapabilities> = {
    [Platform.WHATSAPP]: {
      maxButtons: 3,
      maxCharacters: 4096,
      supportsMedia: true,
      supportsLocation: true,
      supportsLists: true,
      supportsCards: false, // WhatsApp doesn't support cards like FB
      supportsQuickReplies: false, // Uses buttons instead
      supportsRichText: true,
      supportsDtmf: false,
      buttonStyle: 'reply',
    },
    [Platform.TELEGRAM]: {
      maxButtons: 100, // Practically unlimited
      maxCharacters: 4096,
      supportsMedia: true,
      supportsLocation: true,
      supportsLists: false,
      supportsCards: false,
      supportsQuickReplies: false,
      supportsRichText: true, // Markdown
      supportsDtmf: false,
      buttonStyle: 'inline',
    },
    [Platform.INSTAGRAM]: {
      maxButtons: 13, // Quick replies limit
      maxCharacters: 1000,
      supportsMedia: true,
      supportsLocation: false,
      supportsLists: false,
      supportsCards: true,
      supportsQuickReplies: true,
      supportsRichText: false,
      supportsDtmf: false,
      buttonStyle: 'quick_reply',
    },
    [Platform.SMS]: {
      maxButtons: 0,
      maxCharacters: 160, // Per segment
      supportsMedia: false,
      supportsLocation: false,
      supportsLists: false,
      supportsCards: false,
      supportsQuickReplies: false,
      supportsRichText: false,
      supportsDtmf: false,
      buttonStyle: 'none',
    },
    [Platform.VOICE]: {
      maxButtons: 0,
      maxCharacters: 10000, // TTS can handle long text
      supportsMedia: false,
      supportsLocation: false,
      supportsLists: false,
      supportsCards: false,
      supportsQuickReplies: false,
      supportsRichText: false,
      supportsDtmf: true,
      buttonStyle: 'none',
    },
    [Platform.WEB]: {
      maxButtons: 20,
      maxCharacters: 10000,
      supportsMedia: true,
      supportsLocation: true,
      supportsLists: true,
      supportsCards: true,
      supportsQuickReplies: true,
      supportsRichText: true,
      supportsDtmf: false,
      buttonStyle: 'inline',
    },
  };

  constructor() {
    this.logger.log('✅ ChannelVariantsService initialized');
  }

  /**
   * Get channel capabilities
   */
  getCapabilities(platform: Platform): ChannelCapabilities {
    return this.capabilities[platform] || this.capabilities[Platform.WEB];
  }

  /**
   * Adapt a flow response for a specific channel
   */
  adaptResponse(
    response: {
      text: string;
      buttons?: Array<{ id: string; label: string; value: string }>;
      cards?: any[];
      media?: { type: string; url: string };
      locationRequest?: boolean;
      listSections?: any[];
    },
    platform: Platform,
  ): ChannelAdaptedResponse {
    const caps = this.getCapabilities(platform);
    const adapted: ChannelAdaptedResponse = { text: response.text };

    // Handle text length
    if (response.text.length > caps.maxCharacters) {
      adapted.text = this.truncateText(response.text, caps.maxCharacters, platform);
    }

    // Handle buttons
    if (response.buttons && response.buttons.length > 0) {
      if (caps.maxButtons === 0) {
        // Convert buttons to text (SMS, Voice)
        if (caps.supportsDtmf) {
          // Voice: Convert to DTMF menu
          adapted.dtmfMenu = response.buttons.slice(0, 9).map((btn, idx) => ({
            digit: String(idx + 1),
            label: btn.label,
          }));
          adapted.text = this.appendDtmfMenu(adapted.text, adapted.dtmfMenu);
        } else {
          // SMS: Append options as text
          adapted.text = this.appendButtonsAsText(adapted.text, response.buttons);
        }
      } else {
        // Limit buttons to channel max
        adapted.buttons = response.buttons.slice(0, caps.maxButtons).map(btn => ({
          id: btn.id,
          label: btn.label.substring(0, this.getButtonLabelLimit(platform)),
          value: btn.value,
        }));

        // If more buttons than allowed, add "More options" hint
        if (response.buttons.length > caps.maxButtons) {
          adapted.text += `\n\n(${response.buttons.length - caps.maxButtons} more options available)`;
        }
      }
    }

    // Handle cards
    if (response.cards && caps.supportsCards) {
      adapted.cards = response.cards;
    } else if (response.cards && !caps.supportsCards) {
      // Convert cards to text format
      adapted.text = this.convertCardsToText(adapted.text, response.cards, platform);
    }

    // Handle media
    if (response.media && caps.supportsMedia) {
      adapted.media = response.media;
    } else if (response.media && !caps.supportsMedia) {
      // Add URL as text for channels that don't support media
      if (platform !== Platform.VOICE) {
        adapted.text += `\n\nView: ${response.media.url}`;
      }
    }

    // Handle location request
    if (response.locationRequest && caps.supportsLocation) {
      adapted.locationRequest = true;
    } else if (response.locationRequest && !caps.supportsLocation) {
      adapted.text += '\n\nPlease share your location by replying with your address or coordinates.';
    }

    // Handle list sections (WhatsApp only)
    if (response.listSections && caps.supportsLists) {
      adapted.listSections = response.listSections;
    } else if (response.listSections && !caps.supportsLists) {
      // Convert list to buttons or text
      const items = response.listSections.flatMap(s => s.items);
      if (caps.maxButtons > 0) {
        adapted.buttons = items.slice(0, caps.maxButtons).map((item, idx) => ({
          id: `item_${idx}`,
          label: item.title.substring(0, this.getButtonLabelLimit(platform)),
          value: item.id || item.title,
        }));
      } else {
        adapted.text = this.convertListToText(adapted.text, response.listSections);
      }
    }

    // Platform-specific formatting
    adapted.text = this.formatForPlatform(adapted.text, platform);

    return adapted;
  }

  /**
   * Get button label character limit for platform
   */
  private getButtonLabelLimit(platform: Platform): number {
    switch (platform) {
      case Platform.WHATSAPP:
        return 20;
      case Platform.TELEGRAM:
        return 64;
      case Platform.INSTAGRAM:
        return 20;
      default:
        return 20;
    }
  }

  /**
   * Truncate text intelligently
   */
  private truncateText(text: string, maxLength: number, platform: Platform): string {
    if (text.length <= maxLength) return text;

    // For SMS, truncate at word boundary
    if (platform === Platform.SMS) {
      const truncated = text.substring(0, maxLength - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      return truncated.substring(0, lastSpace > maxLength / 2 ? lastSpace : maxLength - 3) + '...';
    }

    // For other platforms, keep complete sentences if possible
    const truncated = text.substring(0, maxLength - 50);
    const lastSentence = truncated.lastIndexOf('. ');
    if (lastSentence > maxLength / 2) {
      return truncated.substring(0, lastSentence + 1) + '\n\n(Message truncated)';
    }

    return text.substring(0, maxLength - 20) + '... (continued)';
  }

  /**
   * Convert buttons to text options
   */
  private appendButtonsAsText(
    text: string,
    buttons: Array<{ label: string; value: string }>,
  ): string {
    if (buttons.length === 0) return text;

    const optionsText = buttons
      .map((btn, idx) => `${idx + 1}. ${btn.label}`)
      .join('\n');

    return `${text}\n\nOptions:\n${optionsText}\n\nReply with the number of your choice.`;
  }

  /**
   * Append DTMF menu to text for voice
   */
  private appendDtmfMenu(
    text: string,
    menu: Array<{ digit: string; label: string }>,
  ): string {
    if (menu.length === 0) return text;

    const menuText = menu
      .map(item => `Press ${item.digit} for ${item.label}`)
      .join('. ');

    return `${text}. ${menuText}. Press 0 to go back or 9 to speak to an agent.`;
  }

  /**
   * Convert cards to text format
   * Different formats for different platforms:
   * - WhatsApp: Rich emoji-based format with clear structure
   * - SMS: Minimal, concise format
   * - Voice: TTS-friendly natural language
   */
  private convertCardsToText(text: string, cards: any[], platform: Platform): string {
    if (cards.length === 0) return text;

    let cardsText: string;

    if (platform === Platform.WHATSAPP) {
      // WhatsApp: Rich format with emojis and structure (Zomato-like)
      cardsText = cards.slice(0, 5).map((card, idx) => {
        const vegIcon = card.veg === true ? '🟢' : card.veg === false ? '🔴' : '';
        const rating = card.rating ? `⭐ ${Number(card.rating).toFixed(1)}` : '';
        const price = card.price ? (typeof card.price === 'string' ? card.price : `₹${card.price}`) : '';
        const delivery = card.deliveryTime || card.delivery_time || '';
        const store = card.storeName || card.store_name || '';
        const distance = card.distance || (card.distanceKm ? `${card.distanceKm.toFixed(1)}km` : '');
        
        // Availability status
        const isAvailable = card.isAvailable !== false && card.isOpen !== false;
        const availabilityBadge = !isAvailable ? '⏸️ Closed' : '';
        const opensAt = card.openingTime || card.opensAt;
        
        let cardText = `${idx + 1}. ${vegIcon} *${card.title || card.name}*`;
        
        // Show closed status prominently
        if (!isAvailable) {
          cardText += ` ${availabilityBadge}`;
          if (opensAt) {
            cardText += `\n   🕐 Opens ${opensAt}`;
          }
        }
        
        if (rating || price) {
          cardText += `\n   ${rating}${rating && price ? ' • ' : ''}${price}`;
        }
        
        if (delivery && isAvailable) {
          cardText += `\n   🕐 ${delivery}`;
        }
        
        if (store) {
          cardText += `\n   📍 ${store}${distance ? ` (${distance})` : ''}`;
        }
        
        if (card.description && card.description.length > 0) {
          cardText += `\n   _${card.description.substring(0, 80)}${card.description.length > 80 ? '...' : ''}_`;
        }
        
        return cardText;
      }).join('\n\n');
      
      // Add quick action hint
      cardsText += '\n\n_Reply with the item number to add to cart_';
      
    } else if (platform === Platform.SMS) {
      // SMS: Ultra-concise format
      cardsText = cards.slice(0, 3).map((card, idx) => {
        const price = card.price ? (typeof card.price === 'string' ? card.price : `₹${card.price}`) : '';
        return `${idx + 1}. ${card.title || card.name} ${price}`.substring(0, 50);
      }).join('\n');
      
    } else if (platform === Platform.VOICE) {
      // Voice: Natural language for TTS with availability status
      cardsText = cards.slice(0, 3).map((card, idx) => {
        const price = card.price ? (typeof card.price === 'string' ? card.price.replace('₹', 'rupees ') : `rupees ${card.price}`) : '';
        const isAvailable = card.isAvailable !== false && card.isOpen !== false;
        const opensAt = card.openingTime || card.opensAt;
        
        let text = `Option ${idx + 1}: ${card.title || card.name}`;
        if (!isAvailable) {
          text += `, currently closed`;
          if (opensAt) {
            text += `, opens at ${opensAt}`;
          }
        } else if (price) {
          text += `, priced at ${price}`;
        }
        return text;
      }).join('. ');
      cardsText += '. Say the option number to select.';
      
    } else {
      // Default: Simple format
      cardsText = cards.slice(0, 5).map((card, idx) => {
        let cardText = `${idx + 1}. ${card.title || card.name}`;
        if (card.description) {
          cardText += `\n   ${card.description.substring(0, 100)}`;
        }
        if (card.price) {
          const priceStr = typeof card.price === 'string' ? card.price : `₹${card.price}`;
          cardText += `\n   ${priceStr}`;
        }
        return cardText;
      }).join('\n\n');
    }

    return `${text}\n\n${cardsText}`;
  }

  /**
   * Convert list sections to text
   */
  private convertListToText(text: string, sections: any[]): string {
    const listText = sections.map(section => {
      const itemsText = section.items
        .slice(0, 5)
        .map((item: any, idx: number) => `  ${idx + 1}. ${item.title}`)
        .join('\n');
      return `${section.title}:\n${itemsText}`;
    }).join('\n\n');

    return `${text}\n\n${listText}`;
  }

  /**
   * Apply platform-specific text formatting
   */
  private formatForPlatform(text: string, platform: Platform): string {
    switch (platform) {
      case Platform.WHATSAPP:
        // WhatsApp supports *bold*, _italic_, ~strikethrough~, ```code```
        // Keep formatting as is
        return text;

      case Platform.TELEGRAM:
        // Telegram supports Markdown and HTML
        // Convert simple formatting to Markdown
        return text;

      case Platform.VOICE:
        // Remove emojis and special characters for TTS
        return text
          .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
          .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Symbols & pictographs
          .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport
          .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
          .replace(/[*_~`]/g, '') // Remove markdown
          .replace(/\n{3,}/g, '\n\n') // Reduce newlines
          .trim();

      case Platform.SMS:
        // SMS: Remove all formatting, keep plain text
        return text
          .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Remove emojis
          .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
          .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
          .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
          .replace(/[*_~`]/g, '')
          .replace(/\n{2,}/g, '\n')
          .trim();

      default:
        return text;
    }
  }

  /**
   * Check if a response element is supported by platform
   */
  supportsFeature(
    platform: Platform,
    feature: 'buttons' | 'cards' | 'media' | 'location' | 'lists' | 'dtmf',
  ): boolean {
    const caps = this.getCapabilities(platform);
    
    switch (feature) {
      case 'buttons':
        return caps.maxButtons > 0;
      case 'cards':
        return caps.supportsCards;
      case 'media':
        return caps.supportsMedia;
      case 'location':
        return caps.supportsLocation;
      case 'lists':
        return caps.supportsLists;
      case 'dtmf':
        return caps.supportsDtmf;
      default:
        return false;
    }
  }

  /**
   * Get channel-specific flow variant ID
   * Allows defining different flows for different channels
   */
  getFlowVariantId(baseFlowId: string, platform: Platform): string {
    // Check for channel-specific variant
    const variantId = `${baseFlowId}_${platform}`;
    
    // Could check database for variant existence here
    // For now, return base flow ID
    return baseFlowId;
  }

  /**
   * Get recommended response length for platform
   */
  getRecommendedLength(platform: Platform): number {
    switch (platform) {
      case Platform.SMS:
        return 140; // Leave room for URL shortening
      case Platform.VOICE:
        return 200; // ~30 seconds of speech
      case Platform.WHATSAPP:
        return 500; // Good for readability
      case Platform.TELEGRAM:
        return 500;
      case Platform.INSTAGRAM:
        return 300;
      default:
        return 500;
    }
  }
}
