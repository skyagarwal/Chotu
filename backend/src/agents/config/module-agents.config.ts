import { ModuleType, AgentType } from '../types/agent.types';

/**
 * Module-Agent Assignment Configuration
 * 
 * Defines which agents are available for each module and their priority order.
 * The IntentRouterService uses this to route intents to the appropriate agent.
 * 
 * Updated to match MySQL database module types (grocery, food, pharmacy, ecom, parcel)
 */

export interface ModuleConfig {
  module: ModuleType;
  primaryAgent: AgentType;
  availableAgents: AgentType[];
  intents: Record<string, AgentType>;
}

/**
 * Module Agent Configuration
 * 
 * Defines which agents are available for each module type.
 * Updated to match MySQL database module types (grocery, food, pharmacy, ecom, parcel)
 */
export const MODULE_AGENT_CONFIG: ModuleConfig[] = [
  {
    module: ModuleType.GROCERY,
    primaryAgent: AgentType.SEARCH,
    availableAgents: [
      AgentType.SEARCH,      // Product search and browse
      AgentType.ORDER,       // Order management
      AgentType.FAQ,         // General queries
      AgentType.COMPLAINTS,  // Issues and support
    ],
    intents: {
      search_product: AgentType.SEARCH,
      find_items: AgentType.SEARCH,
      show_products: AgentType.SEARCH,
      check_order: AgentType.ORDER,
      order_status: AgentType.ORDER,
      quality_complaint: AgentType.COMPLAINTS,
      delivery_complaint: AgentType.COMPLAINTS,
    },
  },
  {
    module: ModuleType.FOOD,
    primaryAgent: AgentType.ORDER,
    availableAgents: [
      AgentType.SEARCH,      // Restaurant and menu search
      AgentType.ORDER,       // Food ordering
      AgentType.FAQ,         // General queries
      AgentType.COMPLAINTS,  // Food quality, delivery issues
    ],
    intents: {
      search_restaurant: AgentType.SEARCH,
      find_food: AgentType.SEARCH,
      show_menu: AgentType.SEARCH,
      order_food: AgentType.ORDER,
      check_order: AgentType.ORDER,
      quality_complaint: AgentType.COMPLAINTS,
      wrong_item: AgentType.COMPLAINTS,
    },
  },
  {
    module: ModuleType.PHARMACY,
    primaryAgent: AgentType.SEARCH,
    availableAgents: [
      AgentType.SEARCH,      // Medicine search
      AgentType.ORDER,       // Prescription order
      AgentType.FAQ,         // Medicine information
      AgentType.COMPLAINTS,  // Quality issues
    ],
    intents: {
      search_medicine: AgentType.SEARCH,
      find_pharmacy: AgentType.SEARCH,
      order_medicine: AgentType.ORDER,
      upload_prescription: AgentType.ORDER,
      medicine_info: AgentType.FAQ,
    },
  },
  {
    module: ModuleType.ECOM,
    primaryAgent: AgentType.SEARCH,
    availableAgents: [
      AgentType.SEARCH,      // Product discovery and search
      AgentType.ORDER,       // Order placement and tracking
      AgentType.FAQ,         // Product information, policies
      AgentType.COMPLAINTS,  // Returns, refunds, quality issues
    ],
    intents: {
      search_product: AgentType.SEARCH,
      find_items: AgentType.SEARCH,
      browse_categories: AgentType.SEARCH,
      order_status: AgentType.ORDER,
      track_order: AgentType.ORDER,
      return_request: AgentType.COMPLAINTS,
      refund_request: AgentType.COMPLAINTS,
    },
  },
  {
    module: ModuleType.PARCEL,
    primaryAgent: AgentType.BOOKING,
    availableAgents: [
      AgentType.BOOKING,     // Parcel booking and scheduling
      AgentType.ORDER,       // Track parcel
      AgentType.FAQ,         // Rates, policies
      AgentType.COMPLAINTS,  // Delivery issues
    ],
    intents: {
      book_parcel: AgentType.BOOKING,
      schedule_delivery: AgentType.BOOKING,
      track_parcel: AgentType.ORDER,
      check_rates: AgentType.FAQ,
      delivery_complaint: AgentType.COMPLAINTS,
    },
  },
];

/**
 * Intent-to-Agent Mapping
 * 
 * Maps specific intents to their handling agents.
 * Used when the intent is already classified by NLU.
 */
export const INTENT_AGENT_MAP: Record<string, AgentType> = {
  // Search intents
  search: AgentType.SEARCH,
  find_restaurant: AgentType.SEARCH,
  find_product: AgentType.SEARCH,
  browse_menu: AgentType.SEARCH,
  search_items: AgentType.SEARCH,
  order_food: AgentType.SEARCH, // Route "order food" to search first to show products
  
  // Order intents
  add_to_cart: AgentType.ORDER,
  track_order: AgentType.ORDER,
  order_status: AgentType.ORDER,
  where_is_order: AgentType.ORDER,
  cancel_order: AgentType.ORDER,
  modify_order: AgentType.ORDER,
  repeat_order: AgentType.ORDER,
  order_details: AgentType.ORDER,
  
  // Booking intents
  book_ride: AgentType.BOOKING,
  book_room: AgentType.BOOKING,
  book_movie: AgentType.BOOKING,
  book_appointment: AgentType.BOOKING,
  book_service: AgentType.BOOKING,
  schedule_parcel: AgentType.BOOKING,
  
  // Complaint intents
  complaint: AgentType.COMPLAINTS,
  issue: AgentType.COMPLAINTS,
  problem: AgentType.COMPLAINTS,
  refund: AgentType.COMPLAINTS,
  poor_quality: AgentType.COMPLAINTS,
  delayed_delivery: AgentType.COMPLAINTS,
  missing_items: AgentType.COMPLAINTS,
  
  // FAQ intents
  greeting: AgentType.FAQ,
  hello: AgentType.FAQ,
  hi: AgentType.FAQ,
  help: AgentType.FAQ,
  support: AgentType.FAQ,
  how_to: AgentType.FAQ,
  what_is: AgentType.FAQ,
  general_question: AgentType.FAQ,
  escalate: AgentType.FAQ,
};

/**
 * Get agent configuration for a specific module
 */
export function getModuleConfig(module: ModuleType): ModuleConfig | undefined {
  return MODULE_AGENT_CONFIG.find((config) => config.module === module);
}

/**
 * Get primary agent for a module
 */
export function getPrimaryAgent(module: ModuleType): AgentType {
  const config = getModuleConfig(module);
  return config?.primaryAgent || AgentType.FAQ; // Default to FAQ if not found
}

/**
 * Get all available agents for a module
 */
export function getAvailableAgents(module: ModuleType): AgentType[] {
  const config = getModuleConfig(module);
  return config?.availableAgents || [AgentType.FAQ]; // Default to FAQ if not found
}

/**
 * Get agent for a specific intent
 */
export function getAgentForIntent(intent: string): AgentType | undefined {
  return INTENT_AGENT_MAP[intent.toLowerCase()];
}

/**
 * Check if an agent is available for a module
 */
export function isAgentAvailableForModule(
  agent: AgentType,
  module: ModuleType,
): boolean {
  const config = getModuleConfig(module);
  return config?.availableAgents.includes(agent) || false;
}
