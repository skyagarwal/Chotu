export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'location' | 'button' | 'image' | 'document';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'list_reply' | 'button_reply';
    list_reply?: {
      id: string;
      title: string;
    };
    button_reply?: {
      id: string;
      title: string;
    };
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

export interface WhatsAppWebhook {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface Session {
  phoneNumber: string;
  currentStep: string;
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}


