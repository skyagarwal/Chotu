-- Personalization Engine Schema - Standalone Version
-- Creates all necessary tables without dependencies

-- ===================================
-- USER PROFILES
-- ===================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  
  -- Dietary Preferences
  dietary_type VARCHAR(20), -- veg, non_veg, vegan, jain, halal
  dietary_restrictions TEXT[], -- ['no_onion', 'no_garlic', 'gluten_free']
  allergies TEXT[],
  favorite_cuisines JSONB DEFAULT '{}', -- {'italian': 0.9, 'indian': 0.8}
  disliked_ingredients TEXT[],
  
  -- Ordering Behavior
  avg_order_value DECIMAL(10,2),
  order_frequency VARCHAR(20), -- daily, weekly, monthly
  preferred_meal_times JSONB, -- {'breakfast': '08:00', 'dinner': '20:00'}
  price_sensitivity VARCHAR(20), -- low, medium, high
  
  -- Communication Style
  communication_tone VARCHAR(20), -- formal, casual, friendly
  personality_traits JSONB DEFAULT '{}', -- {'patient': true, 'decisive': true}
  
  -- Profile Metrics
  profile_completeness INTEGER DEFAULT 0, -- 0-100%
  last_conversation_analyzed TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);

-- ===================================
-- USER INSIGHTS
-- ===================================
CREATE TABLE IF NOT EXISTS user_insights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  insight_type VARCHAR(50) NOT NULL, -- dietary, tone, preference, behavior
  insight_key VARCHAR(100) NOT NULL,
  insight_value TEXT NOT NULL,
  confidence DECIMAL(5,4), -- 0.0000 to 1.0000
  source VARCHAR(50), -- conversation, order_history, search
  conversation_id VARCHAR(100),
  extracted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insights_type ON user_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_user_insights_confidence ON user_insights(confidence);

-- ===================================
-- USER SEARCH PATTERNS
-- ===================================
CREATE TABLE IF NOT EXISTS user_search_patterns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  search_query TEXT,
  search_filters JSONB,
  result_clicked INTEGER,
  result_ordered BOOLEAN DEFAULT FALSE,
  search_time TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_search_patterns_user_id ON user_search_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_patterns_time ON user_search_patterns(search_time);

-- ===================================
-- PERSONALIZATION RULES
-- ===================================
CREATE TABLE IF NOT EXISTS personalization_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  rule_type VARCHAR(50), -- boost_category, boost_store, filter_dietary
  entity_id INTEGER, -- category_id, store_id, item_id
  boost_factor DECIMAL(5,2) DEFAULT 1.0, -- 1.5, 2.0, 3.0
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personalization_rules_user_id ON personalization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_personalization_rules_active ON personalization_rules(is_active);

-- ===================================
-- USER INTERACTIONS
-- ===================================
CREATE TABLE IF NOT EXISTS user_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  interaction_type VARCHAR(20), -- click, view, order, favorite, dislike
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_item_id ON user_interactions(item_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);

-- ===================================
-- CONVERSATION MEMORY
-- ===================================
CREATE TABLE IF NOT EXISTS conversation_memory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role VARCHAR(10), -- user, assistant
  content TEXT NOT NULL,
  turn_number INTEGER,
  session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_id ON conversation_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_session ON conversation_memory(session_id);

-- ===================================
-- COMMENTS
-- ===================================
COMMENT ON TABLE user_profiles IS 'AI-learned user profiles from conversations';
COMMENT ON TABLE user_insights IS 'Individual insights extracted from conversations';
COMMENT ON TABLE user_search_patterns IS 'Search behavior tracking';
COMMENT ON TABLE personalization_rules IS 'Custom boosting rules per user';
COMMENT ON TABLE user_interactions IS 'Click/order/favorite tracking';
COMMENT ON TABLE conversation_memory IS 'Long-term conversation context (last 10 turns)';

-- ===================================
-- SUCCESS MESSAGE
-- ===================================
DO $$
BEGIN
  RAISE NOTICE 'Personalization engine schema created successfully!';
  RAISE NOTICE 'Tables created: user_profiles, user_insights, user_search_patterns, personalization_rules, user_interactions, conversation_memory';
END $$;
