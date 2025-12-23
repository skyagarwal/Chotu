-- ===================================
-- SELF-LEARNING MISSION SYSTEM
-- ===================================
-- Missions auto-generate based on:
-- 1. Intent coverage gaps (which intents need more data)
-- 2. User behavior patterns (what users struggle with)
-- 3. Language distribution (balance en/hi/mr/hinglish)
-- 4. Real store/product data from PHP backend
-- 5. Successful vs failed missions (difficulty tuning)

-- ===================================
-- MISSION GENERATION RULES (AI learns from this)
-- ===================================
CREATE TABLE IF NOT EXISTS mission_generation_rules (
  id SERIAL PRIMARY KEY,
  
  -- Rule Identity
  rule_name VARCHAR(100) UNIQUE NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- intent_gap, language_gap, difficulty_tuning, user_behavior
  priority INTEGER DEFAULT 0, -- Higher = more important
  
  -- Trigger Conditions (When to generate mission)
  trigger_condition JSONB NOT NULL,
  -- Examples:
  -- {"intent": "book_parcel", "sample_count_below": 50}
  -- {"language": "hi", "percentage_below": 25}
  -- {"user_failure_rate_above": 0.5, "difficulty": "hard"}
  
  -- Mission Template Selection
  game_type VARCHAR(50), -- Which game to use
  target_intent VARCHAR(100),
  module_id INTEGER,
  difficulty VARCHAR(20),
  
  -- Dynamic Content Source
  content_source VARCHAR(50), -- php_stores, php_products, user_locations, llm_generated
  content_query TEXT, -- SQL or API endpoint to fetch real data
  
  -- LLM Generation Config
  llm_prompt_template TEXT, -- Template for LLM to generate mission
  llm_model VARCHAR(50) DEFAULT 'qwen', -- qwen, gpt4, etc.
  
  -- Reward Configuration
  reward_config_name VARCHAR(100) NOT NULL,
  
  -- Language Support
  languages TEXT[] DEFAULT ARRAY['en'],
  auto_translate BOOLEAN DEFAULT FALSE, -- Auto-translate to other languages
  
  -- Validity
  active BOOLEAN DEFAULT TRUE,
  min_user_level INTEGER DEFAULT 1,
  
  -- Learning Metadata
  missions_generated_count INTEGER DEFAULT 0,
  avg_success_rate DECIMAL(5,2),
  avg_user_rating DECIMAL(3,2), -- Users can rate missions
  last_generated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mission_rules_active ON mission_generation_rules(active, priority DESC);
CREATE INDEX idx_mission_rules_type ON mission_generation_rules(rule_type);

-- ===================================
-- INTENT COVERAGE TRACKING (Self-learning)
-- ===================================
CREATE TABLE IF NOT EXISTS intent_coverage_stats (
  id SERIAL PRIMARY KEY,
  
  intent VARCHAR(100) UNIQUE NOT NULL,
  module_id INTEGER,
  
  -- Current Coverage
  total_samples INTEGER DEFAULT 0,
  samples_last_7days INTEGER DEFAULT 0,
  samples_last_30days INTEGER DEFAULT 0,
  
  -- Language Distribution
  language_distribution JSONB DEFAULT '{}', -- {"en": 50, "hi": 30, "mr": 10, "hinglish": 10}
  
  -- Quality Metrics
  avg_confidence DECIMAL(5,4) DEFAULT 0,
  avg_user_score INTEGER DEFAULT 0, -- How well users perform on this intent
  
  -- Gap Analysis
  target_samples INTEGER DEFAULT 100, -- How many we want
  coverage_percentage DECIMAL(5,2) DEFAULT 0,
  priority_score INTEGER DEFAULT 0, -- Auto-calculated priority
  
  -- Status
  status VARCHAR(50) DEFAULT 'needs_data', -- needs_data, sufficient, overfilled
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_intent_coverage_priority ON intent_coverage_stats(priority_score DESC, status);

-- ===================================
-- MISSION PERFORMANCE TRACKING (Self-learning)
-- ===================================
CREATE TABLE IF NOT EXISTS mission_performance (
  id SERIAL PRIMARY KEY,
  
  -- Mission Identity
  mission_template_id INTEGER, -- If from mission_templates
  generated_mission_id VARCHAR(100), -- If dynamically generated
  mission_type VARCHAR(50) NOT NULL,
  
  -- Performance Metrics
  total_attempts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  
  -- User Feedback
  total_ratings INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0, -- 1-5 stars
  too_easy_count INTEGER DEFAULT 0,
  too_hard_count INTEGER DEFAULT 0,
  just_right_count INTEGER DEFAULT 0,
  
  -- Time Metrics
  avg_completion_time_seconds INTEGER,
  
  -- Difficulty Assessment (AI learns this)
  actual_difficulty VARCHAR(20), -- What users think: easy, medium, hard
  configured_difficulty VARCHAR(20), -- What we labeled it
  difficulty_mismatch BOOLEAN DEFAULT FALSE, -- If actual != configured
  
  -- Learning Insights
  common_failure_reasons JSONB, -- Why users fail
  successful_patterns JSONB, -- What makes users succeed
  
  -- Auto-Tuning
  should_adjust_difficulty BOOLEAN DEFAULT FALSE,
  suggested_difficulty VARCHAR(20),
  should_add_hints BOOLEAN DEFAULT FALSE,
  suggested_hints TEXT[],
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mission_performance_success ON mission_performance(success_rate);
CREATE INDEX idx_mission_performance_mismatch ON mission_performance(difficulty_mismatch);

-- ===================================
-- USER LEARNING PROFILES (Adaptive difficulty)
-- ===================================
CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER UNIQUE NOT NULL,
  
  -- Skill Levels per Intent Category
  parcel_skill_level INTEGER DEFAULT 1, -- 1-10
  food_skill_level INTEGER DEFAULT 1,
  ecommerce_skill_level INTEGER DEFAULT 1,
  general_skill_level INTEGER DEFAULT 1,
  
  -- Language Proficiency
  english_proficiency VARCHAR(20) DEFAULT 'medium', -- basic, medium, advanced
  hindi_proficiency VARCHAR(20) DEFAULT 'medium',
  marathi_proficiency VARCHAR(20) DEFAULT 'medium',
  hinglish_proficiency VARCHAR(20) DEFAULT 'medium',
  
  -- Learning Style
  preferred_difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  learns_best_with VARCHAR(50), -- hints, examples, trial_error
  attention_span VARCHAR(20) DEFAULT 'medium', -- short, medium, long
  
  -- Engagement Patterns
  preferred_game_types TEXT[], -- Which games they like
  peak_activity_hours INTEGER[], -- When they play (0-23)
  avg_session_length_minutes INTEGER,
  
  -- Adaptive Settings
  current_difficulty_multiplier DECIMAL(3,2) DEFAULT 1.0, -- 0.5-2.0
  auto_increase_difficulty BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_learning_user ON user_learning_profiles(user_id);

-- ===================================
-- DYNAMIC MISSION TEMPLATES (LLM-generated, stored for reuse)
-- ===================================
CREATE TABLE IF NOT EXISTS generated_missions (
  id SERIAL PRIMARY KEY,
  
  -- Generation Source
  generation_rule_id INTEGER REFERENCES mission_generation_rules(id),
  generated_by VARCHAR(50) DEFAULT 'llm', -- llm, rule_based, hybrid
  llm_model VARCHAR(50),
  
  -- Mission Content
  mission_id VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- Classification
  game_type VARCHAR(50) NOT NULL,
  target_intent VARCHAR(100),
  module_id INTEGER,
  difficulty VARCHAR(20),
  language VARCHAR(10) DEFAULT 'en',
  
  -- Requirements
  expected_entities JSONB DEFAULT '[]',
  hints JSONB DEFAULT '[]',
  
  -- Context (Real data used)
  real_data_context JSONB, -- Store names, product names, locations used
  
  -- Rewards
  reward_config_name VARCHAR(100),
  
  -- Quality Control
  quality_score DECIMAL(5,2), -- LLM self-assessment 0-100
  human_reviewed BOOLEAN DEFAULT FALSE,
  human_review_score INTEGER,
  review_feedback TEXT,
  
  -- Performance
  times_used INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_user_rating DECIMAL(3,2),
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP, -- Some missions are time-sensitive
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_generated_missions_active ON generated_missions(active, language, difficulty);
CREATE INDEX idx_generated_missions_intent ON generated_missions(target_intent);
CREATE INDEX idx_generated_missions_quality ON generated_missions(quality_score DESC);

-- ===================================
-- REAL-TIME DATA SOURCES (For dynamic missions)
-- ===================================
CREATE TABLE IF NOT EXISTS mission_data_sources (
  id SERIAL PRIMARY KEY,
  
  source_name VARCHAR(100) UNIQUE NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- php_api, database_query, external_api, static_data
  
  -- Connection Details
  endpoint_url TEXT,
  query_template TEXT, -- SQL or API query
  refresh_interval_hours INTEGER DEFAULT 24,
  
  -- Data Schema
  data_fields JSONB, -- What fields are available
  sample_data JSONB, -- Example for LLM context
  
  -- Usage
  used_by_rules INTEGER[], -- Which generation rules use this
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending', -- pending, syncing, success, failed
  sync_error TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data sources
INSERT INTO mission_data_sources (source_name, source_type, query_template, data_fields) VALUES
('php_active_stores', 'database_query', 'SELECT id, name, category, zone_id, rating FROM stores WHERE active = true', 
 '{"fields": ["id", "name", "category", "zone_id", "rating"]}'::jsonb),
 
('php_popular_products', 'database_query', 'SELECT id, name, category_id, price, unit FROM items WHERE active = true ORDER BY order_count DESC LIMIT 100',
 '{"fields": ["id", "name", "category_id", "price", "unit"]}'::jsonb),
 
('nashik_locations', 'static_data', NULL,
 '{"locations": ["Nashik Road", "College Road", "Satpur MIDC", "Dwarka", "Pathardi Phata", "Indira Nagar", "Gangapur Road"]}'::jsonb)
ON CONFLICT (source_name) DO NOTHING;

-- ===================================
-- FUNCTIONS: Auto-update intent coverage
-- ===================================
CREATE OR REPLACE FUNCTION update_intent_coverage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update intent coverage stats when training sample is added
  INSERT INTO intent_coverage_stats (
    intent, 
    module_id, 
    total_samples,
    language_distribution
  ) VALUES (
    NEW.intent,
    NEW.module_id,
    1,
    jsonb_build_object(NEW.language, 1)
  )
  ON CONFLICT (intent) DO UPDATE SET
    total_samples = intent_coverage_stats.total_samples + 1,
    language_distribution = jsonb_set(
      intent_coverage_stats.language_distribution,
      ARRAY[NEW.language],
      to_jsonb(COALESCE((intent_coverage_stats.language_distribution->>NEW.language)::int, 0) + 1)
    ),
    coverage_percentage = (intent_coverage_stats.total_samples + 1)::numeric / intent_coverage_stats.target_samples * 100,
    priority_score = CASE 
      WHEN (intent_coverage_stats.total_samples + 1) < intent_coverage_stats.target_samples * 0.5 THEN 10
      WHEN (intent_coverage_stats.total_samples + 1) < intent_coverage_stats.target_samples * 0.75 THEN 5
      ELSE 1
    END,
    status = CASE
      WHEN (intent_coverage_stats.total_samples + 1) >= intent_coverage_stats.target_samples THEN 'sufficient'
      WHEN (intent_coverage_stats.total_samples + 1) >= intent_coverage_stats.target_samples * 1.5 THEN 'overfilled'
      ELSE 'needs_data'
    END,
    updated_at = CURRENT_TIMESTAMP;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_intent_coverage
AFTER INSERT ON training_samples
FOR EACH ROW
EXECUTE FUNCTION update_intent_coverage();

-- ===================================
-- FUNCTIONS: Auto-tune mission difficulty
-- ===================================
CREATE OR REPLACE FUNCTION analyze_mission_difficulty()
RETURNS TRIGGER AS $$
DECLARE
  v_success_rate DECIMAL(5,2);
  v_avg_rating DECIMAL(3,2);
BEGIN
  -- Calculate metrics
  v_success_rate := (NEW.total_completions::numeric / NULLIF(NEW.total_attempts, 0)) * 100;
  v_avg_rating := NEW.avg_rating;
  
  -- Assess difficulty mismatch
  NEW.success_rate := v_success_rate;
  
  -- If too easy (>90% success rate or users say "too easy")
  IF v_success_rate > 90 OR NEW.too_easy_count > NEW.total_ratings * 0.5 THEN
    NEW.actual_difficulty := 'easy';
    IF NEW.configured_difficulty != 'easy' THEN
      NEW.difficulty_mismatch := TRUE;
      NEW.should_adjust_difficulty := TRUE;
      NEW.suggested_difficulty := 'easy';
    END IF;
  END IF;
  
  -- If too hard (<30% success rate or users say "too hard")
  IF v_success_rate < 30 OR NEW.too_hard_count > NEW.total_ratings * 0.5 THEN
    NEW.actual_difficulty := 'hard';
    IF NEW.configured_difficulty != 'hard' THEN
      NEW.difficulty_mismatch := TRUE;
      NEW.should_adjust_difficulty := TRUE;
      NEW.suggested_difficulty := 'hard';
      NEW.should_add_hints := TRUE;
    END IF;
  END IF;
  
  -- Just right (30-90% success rate)
  IF v_success_rate BETWEEN 30 AND 90 THEN
    NEW.actual_difficulty := 'medium';
    NEW.difficulty_mismatch := (NEW.configured_difficulty != 'medium');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_analyze_difficulty
BEFORE UPDATE ON mission_performance
FOR EACH ROW
EXECUTE FUNCTION analyze_mission_difficulty();

-- ===================================
-- SAMPLE GENERATION RULES (Self-learning templates)
-- ===================================
INSERT INTO mission_generation_rules (
  rule_name,
  rule_type,
  priority,
  trigger_condition,
  game_type,
  target_intent,
  module_id,
  difficulty,
  content_source,
  llm_prompt_template,
  reward_config_name,
  languages
) VALUES
-- Rule 1: Generate parcel missions when sample count low
('parcel_gap_filler', 'intent_gap', 10,
 '{"intent": "book_parcel", "sample_count_below": 50}'::jsonb,
 'intent_quest', 'book_parcel', 3, 'medium',
 'php_active_stores',
 'Create a realistic parcel booking scenario using these Indian locations: {locations}. Include pickup and delivery points, item type, and urgency. Make it natural and test user''s ability to express parcel booking intent clearly.',
 'mission_medium',
 ARRAY['en', 'hi', 'hinglish']),

-- Rule 2: Generate food missions using real restaurant data
('food_real_restaurants', 'intent_gap', 9,
 '{"intent": "order_food", "sample_count_below": 100}'::jsonb,
 'intent_quest', 'order_food', 4, 'easy',
 'php_active_stores',
 'Generate a food ordering scenario using this real restaurant: {store_name} in {location}. Include specific food items, quantities, and delivery instructions. Make it feel like a real order.',
 'mission_easy',
 ARRAY['en', 'hi', 'mr', 'hinglish']),

-- Rule 3: Generate Hindi missions when language distribution low
('hindi_language_boost', 'language_gap', 8,
 '{"language": "hi", "percentage_below": 25}'::jsonb,
 'intent_quest', NULL, NULL, 'medium',
 'nashik_locations',
 'Create a delivery scenario in pure Hindi (no Hinglish). Use natural conversational Hindi that tier-2 city users would actually speak. Include locations: {locations}.',
 'mission_medium',
 ARRAY['hi']),

-- Rule 4: Adaptive difficulty based on user failure rate
('adaptive_easy_missions', 'user_behavior', 7,
 '{"user_failure_rate_above": 0.6, "last_10_missions": true}'::jsonb,
 'intent_quest', NULL, NULL, 'easy',
 'php_active_stores',
 'Create a very simple, straightforward scenario. Clear hints, common use case. This is for a user who is struggling, so make it confidence-building.',
 'mission_easy',
 ARRAY['en', 'hi', 'hinglish'])

ON CONFLICT (rule_name) DO NOTHING;

-- ===================================
-- INITIALIZE INTENT TARGETS
-- ===================================
INSERT INTO intent_coverage_stats (intent, module_id, target_samples) VALUES
-- Parcel (11 intents)
('book_parcel', 3, 100),
('track_parcel', 3, 50),
('cancel_parcel', 3, 30),
('modify_parcel', 3, 30),
('parcel_pricing', 3, 40),
('schedule_pickup', 3, 40),
('bulk_parcel_booking', 3, 30),

-- Food (11 intents)
('order_food', 4, 100),
('track_food_order', 4, 50),
('cancel_food_order', 4, 40),
('modify_food_order', 4, 30),
('restaurant_search', 4, 60),
('browse_menu', 4, 50),
('apply_coupon', 4, 30),

-- Ecommerce (8 intents)
('search_product', 5, 80),
('add_to_cart', 5, 60),
('remove_from_cart', 5, 30),
('checkout', 5, 40),
('track_ecom_order', 5, 40),

-- General (5 intents)
('greeting', 1, 100),
('help', 1, 50),
('complaint', 1, 40),
('feedback', 1, 30),
('thank_you', 1, 30)

ON CONFLICT (intent) DO NOTHING;

-- ===================================
-- VIEWS FOR MISSION GENERATION AI
-- ===================================

-- Active rules that should trigger mission generation
CREATE OR REPLACE VIEW v_active_generation_rules AS
SELECT 
  mgr.*,
  ics.total_samples,
  ics.coverage_percentage,
  ics.language_distribution,
  CASE 
    WHEN mgr.rule_type = 'intent_gap' THEN 
      ics.total_samples < (mgr.trigger_condition->>'sample_count_below')::int
    WHEN mgr.rule_type = 'language_gap' THEN
      COALESCE((ics.language_distribution->>mgr.trigger_condition->>'language')::numeric, 0) < 
      (mgr.trigger_condition->>'percentage_below')::numeric
    ELSE TRUE
  END as should_trigger
FROM mission_generation_rules mgr
LEFT JOIN intent_coverage_stats ics ON mgr.target_intent = ics.intent
WHERE mgr.active = TRUE
ORDER BY mgr.priority DESC;

-- Missions needing difficulty adjustment
CREATE OR REPLACE VIEW v_missions_needing_tuning AS
SELECT 
  mission_type,
  configured_difficulty,
  actual_difficulty,
  success_rate,
  avg_rating,
  should_adjust_difficulty,
  suggested_difficulty,
  should_add_hints
FROM mission_performance
WHERE should_adjust_difficulty = TRUE
   OR should_add_hints = TRUE
ORDER BY success_rate ASC;

-- ===================================
-- COMMENTS
-- ===================================
COMMENT ON TABLE mission_generation_rules IS 'Self-learning rules for auto-generating missions based on data gaps';
COMMENT ON TABLE intent_coverage_stats IS 'Tracks which intents need more training data - drives mission generation';
COMMENT ON TABLE mission_performance IS 'Learns from user success/failure to auto-tune difficulty';
COMMENT ON TABLE user_learning_profiles IS 'Adaptive difficulty per user based on skill level';
COMMENT ON TABLE generated_missions IS 'LLM-generated missions stored for reuse and quality tracking';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Self-Learning Mission System Created!';
  RAISE NOTICE '🤖 AI auto-generates missions based on:';
  RAISE NOTICE '   - Intent coverage gaps (which intents need data)';
  RAISE NOTICE '   - Language distribution (balance en/hi/mr/hinglish)';
  RAISE NOTICE '   - User performance (adaptive difficulty)';
  RAISE NOTICE '   - Real store/product data from PHP backend';
  RAISE NOTICE '📊 Tables: mission_generation_rules, intent_coverage_stats, mission_performance';
  RAISE NOTICE '🎯 100% database-driven - NO hardcoded missions!';
END $$;
