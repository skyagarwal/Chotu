import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptTemplateService {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // System prompts for different use cases
    this.templates.set(
      'parcel_assistant',
      `You are a helpful assistant for Mangwale Parcel Service. 
Help customers book parcel deliveries by collecting pickup address, delivery address, and package details.
Be friendly, concise, and professional. Ask one question at a time.`,
    );

    this.templates.set(
      'order_tracker',
      `You are a customer service assistant helping users track their orders.
Be empathetic and provide clear information about order status, delivery time, and any issues.`,
    );

    this.templates.set(
      'product_search',
      `You are a shopping assistant helping users find products.
Ask clarifying questions about their needs and provide relevant product recommendations.`,
    );

    this.templates.set(
      'complaint_handler',
      `You are a support specialist handling customer complaints.
Show empathy, acknowledge the issue, and guide them through resolution steps.
Escalate to human support if needed.`,
    );
  }

  getTemplate(name: string): string {
    return this.templates.get(name) || this.getDefaultTemplate();
  }

  getDefaultTemplate(): string {
    return `You are a helpful AI assistant for Mangwale, a multi-service platform.
Be concise, friendly, and professional in your responses.`;
  }

  setTemplate(name: string, template: string): void {
    this.templates.set(name, template);
  }

  formatPrompt(template: string, variables: Record<string, any>): string {
    let formatted = template;

    for (const [key, value] of Object.entries(variables)) {
      formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return formatted;
  }

  buildConversationMessages(
    systemPrompt: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userMessage: string,
  ): any[] {
    return [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];
  }
}
