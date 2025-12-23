-- User Profile Schema for Personalization Engine
-- Learns from conversations to understand user preferences, tone, and behavior

-- ===================================
-- USER PROFILES - Comprehensive user understanding
-- ===================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  
  -- User Identity
  user_id INTEGER UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  
  -- Food Preferences (learned from conversations)
  food_preferences JSONB DEFAULT '{}', -- {"veg": true, "spice_level": "medium", "cuisines": ["indian", "italian"]}
  dietary_restrictions TEXT[], -- ["no_onion", "no_garlic", "halal", "jain", "vegan"]
  favorite_items INTEGER[], -- Array of item IDs user orders frequently
  disliked_items INTEGER[], -- Items user avoids
  favorite_categories INTEGER[], -- Category IDs user prefers
  favorite_stores INTEGER[], -- Store IDs user orders from
  
  -- Shopping Preferences (ecommerce)
  shopping_preferences JSONB DEFAULT '{}', -- {"brands": ["samsung", "apple"], "price_range": {"min": 0, "max": 50000}}
  product_interests TEXT[], -- ["electronics", "fashion", "books"]
  
  -- Communication Style (tone analysis)
  tone VARCHAR(20) DEFAULT 'neutral', -- formal, casual, friendly, direct, polite
  language VARCHAR(5) DEFAULT 'en',
  preferred_time_of_day VARCHAR(20), -- morning, afternoon, evening, night
  response_style VARCHAR(20) DEFAULT 'detailed', -- brief, detailed, conversational
  emoji_usage VARCHAR(20) DEFAULT 'moderate', -- none, minimal, moderate, frequent
  
  -- Personality Traits (extracted from conversations)
  personality_traits JSONB DEFAULT '{}', -- {"patience": "high", "detail_oriented": true, "price_sensitive": false}
  conversation_patterns JSONB DEFAULT '{}', -- {"asks_questions": true, "uses_abbreviations": false}
  
  -- Behavioral Insights
  avg_order_value DECIMAL(10,2),
  order_frequency VARCHAR(20), -- daily, weekly, monthly, occasional
  preferred_payment_method VARCHAR(30),
  price_sensitivity VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  brand_loyalty BOOLEAN DEFAULT FALSE,
  impulse_buyer BOOLEAN DEFAULT FALSE,
  
  -- Location Preferences
  preferred_delivery_areas JSONB, -- [{"address": "...", "lat": ..., "lon": ..., "frequency": 10}]
  delivery_time_preferences JSONB, -- {"weekday": "19:00-21:00", "weekend": "12:00-14:00"}
  
  -- Engagement Metrics
  total_conversations INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  satisfaction_score DECIMAL(3,2), -- 0.00 to 5.00 (derived from feedback)
  churn_risk VARCHAR(20) DEFAULT 'low', -- low, medium, high
  
  -- Learning Metadata
  profile_completeness INTEGER DEFAULT 0, -- 0-100%
  last_analyzed_at TIMESTAMP,
  confidence_score DECIMAL(5,4) DEFAULT 0.5, -- How confident we are in the profile
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX idx_user_profiles_tone ON user_profiles(tone);
CREATE INDEX idx_user_profiles_updated_at ON user_profiles(updated_at);

-- ===================================
-- CONVERSATION INSIGHTS - Extracted learnings from chats
-- ===================================

CREATE TABLE IF NOT EXISTS conversation_insights (
  id SERIAL PRIMARY KEY,
  
  -- User & Conversation
  user_id INTEGER NOT NULL,
  session_id VARCHAR(100),
  conversation_count INTEGER DEFAULT 1,
  
  -- Extracted Insights
  insight_type VARCHAR(50) NOT NULL, -- food_preference, tone_shift, complaint, compliment, question_pattern
  insight_category VARCHAR(30) NOT NULL, -- dietary, behavioral, emotional, transactional
  
  -- Content
  text_excerpt TEXT, -- Original conversation text
  extracted_value JSONB, -- Structured data {"preference": "veg", "reason": "health"}
  confidence DECIMAL(5,4) DEFAULT 0.7,
  
  -- Context
  intent VARCHAR(50), -- browse_food, place_order, ask_question
  sentiment VARCHAR(20), -- positive, negative, neutral
  
  -- Processing
  analyzed_by VARCHAR(30) DEFAULT 'llm', -- llm, rule_based, hybrid
  processing_time_ms INTEGER,
  
  -- Applied to Profile
  applied_to_profile BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_conversation_insights_user_id ON conversation_insights(user_id);
CREATE INDEX idx_conversation_insights_type ON conversation_insights(insight_type);
CREATE INDEX idx_conversation_insights_applied ON conversation_insights(applied_to_profile, created_at);

-- ===================================
-- USER SEARCH PATTERNS - Search behavior analysis
-- ===================================

CREATE TABLE IF NOT EXISTS user_search_patterns (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL,
  
  -- Search Pattern
  query_text VARCHAR(500),
  query_normalized VARCHAR(500), -- Cleaned version for pattern matching
  module VARCHAR(20), -- food, ecom
  
  -- Frequency
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Outcomes
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0, -- Completed orders from this search
  avg_click_position DECIMAL(5,2), -- Which result position user typically clicks
  
  -- Behavior
  typical_time_of_day VARCHAR(20), -- morning, afternoon, evening, night
  typical_day_of_week VARCHAR(10),
  
  -- Related searches (users who searched X also searched Y)
  related_queries TEXT[],
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_search_patterns_user_id ON user_search_patterns(user_id);
CREATE INDEX idx_user_search_patterns_query ON user_search_patterns(query_normalized);
CREATE INDEX idx_user_search_patterns_module ON user_search_patterns(module);

-- ===================================
-- PERSONALIZATION RULES - Dynamic boosting rules
-- ===================================

CREATE TABLE IF NOT EXISTS personalization_rules (
  id SERIAL PRIMARY KEY,
  
  -- Rule definition
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(30) NOT NULL, -- boost_veg, boost_favorite_store, filter_dietary
  priority INTEGER DEFAULT 100,
  
  -- Conditions (when to apply)
  conditions JSONB, -- {"dietary_restrictions": ["vegan"], "tone": "health_conscious"}
  
  -- Actions (what to do)
  boost_factor DECIMAL(5,2) DEFAULT 1.5, -- Multiply score by this
  filter_rule JSONB, -- {"must_match": {"veg": true}}
  rerank_rule JSONB, -- Custom reranking logic
  
  -- Performance tracking
  times_applied INTEGER DEFAULT 0,
  avg_improvement DECIMAL(5,4), -- CTR improvement from this rule
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_personalization_rules_type ON personalization_rules(rule_type, enabled);

-- ===================================
-- USER ITEM INTERACTIONS - Detailed interaction tracking
-- ===================================

CREATE TABLE IF NOT EXISTS user_item_interactions (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  module VARCHAR(20) NOT NULL, -- food, ecom
  
  -- Interaction types
  viewed_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  ordered_count INTEGER DEFAULT 0,
  saved_count INTEGER DEFAULT 0, -- Wishlisted
  
  -- Timestamps
  first_viewed_at TIMESTAMP,
  last_viewed_at TIMESTAMP,
  last_ordered_at TIMESTAMP,
  
  -- Context
  avg_session_duration INTEGER, -- Seconds spent viewing
  typical_search_query VARCHAR(500), -- How user typically finds this item
  
  -- Sentiment
  rating DECIMAL(3,2), -- User's rating if provided
  review_sentiment VARCHAR(20), -- positive, neutral, negative
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, item_id, module)
);

CREATE INDEX idx_user_item_interactions_user ON user_item_interactions(user_id, module);
CREATE INDEX idx_user_item_interactions_item ON user_item_interactions(item_id, module);
CREATE INDEX idx_user_item_interactions_ordered ON user_item_interactions(ordered_count DESC);

-- ===================================
-- CONVERSATION MEMORY - Long-term memory of user conversations
-- ===================================

CREATE TABLE IF NOT EXISTS conversation_memory (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL,
  
  -- Memory type
  memory_type VARCHAR(30) NOT NULL, -- fact, preference, event, complaint, compliment
  category VARCHAR(30), -- food, personal, service, product
  
  -- Content
  memory_text TEXT NOT NULL, -- "User prefers vegetarian food for health reasons"
  memory_data JSONB, -- Structured version {"preference": "veg", "reason": "health"}
  
  -- Importance (for selective recall)
  importance INTEGER DEFAULT 50, -- 0-100, higher = more important to remember
  recency_score DECIMAL(5,4), -- Decay over time
  
  -- Source
  extracted_from_session VARCHAR(100),
  extracted_from_message TEXT,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Usage
  times_referenced INTEGER DEFAULT 0,
  last_referenced_at TIMESTAMP,
  
  -- Validity
  still_valid BOOLEAN DEFAULT TRUE,
  expired_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_conversation_memory_user ON conversation_memory(user_id, still_valid);
CREATE INDEX idx_conversation_memory_type ON conversation_memory(memory_type, category);
CREATE INDEX idx_conversation_memory_importance ON conversation_memory(importance DESC, recency_score DESC);

COMMENT ON TABLE user_profiles IS 'Comprehensive user profiles built from conversation analysis';
COMMENT ON TABLE conversation_insights IS 'Extracted learnings from individual conversations';
COMMENT ON TABLE user_search_patterns IS 'User search behavior and patterns for personalization';
COMMENT ON TABLE personalization_rules IS 'Dynamic rules for personalizing search and recommendations';
COMMENT ON TABLE user_item_interactions IS 'Detailed tracking of user interactions with items';
COMMENT ON TABLE conversation_memory IS 'Long-term memory of important conversation details';
