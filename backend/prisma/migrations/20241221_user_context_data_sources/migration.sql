-- ============================================
-- FLEXIBLE DATA SOURCE & USER CONTEXT SYSTEM
-- ============================================
-- This migration creates:
-- 1. Data Sources Registry (flexible multi-source)
-- 2. User Context Tables (preferences, favorites)
-- 3. City Knowledge Base
-- 4. Weather/Climate Cache
-- 5. Store External Mapping (Google, etc.)
-- 6. Combined Ratings Cache
-- ============================================

-- ============================================
-- 1. DATA SOURCES REGISTRY
-- ============================================
-- Allows adding multiple sources for reviews, weather, etc.
-- with priority-based fallback

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,  -- 'reviews', 'weather', 'places', 'translation'
  provider VARCHAR(50) NOT NULL,  -- 'google_places', 'open_meteo', 'wttr_in', etc.
  endpoint VARCHAR(500),
  api_key TEXT,  -- Encrypted in production
  config JSONB DEFAULT '{}',
  priority INT DEFAULT 0,  -- Lower = higher priority
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_day INT,
  calls_today INT DEFAULT 0,
  last_call_at TIMESTAMP,
  error_count INT DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_data_sources_provider_type ON data_sources(provider, type);
CREATE INDEX idx_data_sources_active ON data_sources(type, is_active, priority);

-- Insert default sources (FREE APIs)
INSERT INTO data_sources (name, type, provider, endpoint, priority, is_active, rate_limit_per_day) VALUES
  ('Open-Meteo Weather', 'weather', 'open_meteo', 'https://api.open-meteo.com/v1/forecast', 1, true, 10000),
  ('wttr.in Weather', 'weather', 'wttr_in', 'https://wttr.in', 2, true, 10000)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. USER PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(100) PRIMARY KEY,
  dietary_type VARCHAR(20),  -- 'veg', 'non_veg', 'egg', 'vegan', 'jain'
  favorite_cuisines TEXT[] DEFAULT '{}',
  disliked_items TEXT[] DEFAULT '{}',
  spice_level VARCHAR(20),  -- 'mild', 'medium', 'spicy', 'extra_spicy'
  preferred_payment VARCHAR(20) DEFAULT 'cod',
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  order_frequency VARCHAR(20) DEFAULT 'occasional',
  language VARCHAR(10) DEFAULT 'hi',
  uses_voice BOOLEAN DEFAULT false,
  response_style VARCHAR(20) DEFAULT 'brief',  -- 'brief', 'detailed'
  notifications_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. CITY KNOWLEDGE BASE
-- ============================================
-- Stores local knowledge for each city

CREATE TABLE IF NOT EXISTS city_knowledge (
  city_name VARCHAR(100) PRIMARY KEY,
  state_name VARCHAR(100),
  slang JSONB DEFAULT '[]',  -- [{slang: "kay mhanto", meaning: "what say", usage: "greeting"}]
  popular_dishes TEXT[] DEFAULT '{}',
  local_specialties TEXT[] DEFAULT '{}',
  famous_places TEXT[] DEFAULT '{}',
  local_tips TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{"hi", "en"}',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  default_lat DECIMAL(10,6),
  default_lng DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert Nashik knowledge
INSERT INTO city_knowledge (city_name, state_name, slang, popular_dishes, local_specialties, famous_places, local_tips, default_lat, default_lng) VALUES
(
  'Nashik',
  'Maharashtra',
  '[
    {"slang": "काय म्हणतोस", "meaning": "What do you say", "usage": "Greeting"},
    {"slang": "बरोबर", "meaning": "Correct/Right", "usage": "Agreement"},
    {"slang": "झकास", "meaning": "Awesome", "usage": "Appreciation"},
    {"slang": "एकदम भारी", "meaning": "Very good", "usage": "Appreciation"},
    {"slang": "पेटपूजा", "meaning": "Eating food", "usage": "Food context"}
  ]'::jsonb,
  ARRAY['Misal Pav', 'Vada Pav', 'Poha', 'Sabudana Khichdi', 'Puran Poli', 'Modak', 'Thalipeeth'],
  ARRAY['Nashik Grapes', 'Nashik Wine', 'Sula Wines', 'Panchavati Thali'],
  ARRAY['Trimbakeshwar', 'Sula Vineyards', 'Pandavleni Caves', 'Ramkund'],
  ARRAY['Nashik is the wine capital of India', 'Try Misal at Sadhana for authentic taste', 'Grapes are best from February to April'],
  19.9975,
  73.7898
) ON CONFLICT DO NOTHING;

-- ============================================
-- 4. WEATHER CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS weather_cache (
  cache_key VARCHAR(100) PRIMARY KEY,  -- 'zone_1' or '19.99_73.78'
  data JSONB NOT NULL,
  source VARCHAR(50),
  fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_weather_cache_fetched ON weather_cache(fetched_at);

-- ============================================
-- 5. STORE EXTERNAL MAPPING
-- ============================================
-- Maps our stores to external providers (Google, Zomato, etc.)

CREATE TABLE IF NOT EXISTS store_external_mapping (
  store_id VARCHAR(100) PRIMARY KEY,
  store_name VARCHAR(255),
  store_address TEXT,
  -- Google Places
  google_place_id VARCHAR(100),
  google_last_synced TIMESTAMP,
  -- Zomato (if available)
  zomato_id VARCHAR(100),
  zomato_last_synced TIMESTAMP,
  -- Swiggy (if available)
  swiggy_id VARCHAR(100),
  swiggy_last_synced TIMESTAMP,
  -- Match info
  match_confidence DECIMAL(3,2) DEFAULT 0,
  match_source VARCHAR(50),
  match_attempts INT DEFAULT 0,
  last_matched TIMESTAMP,
  -- Status
  is_verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(100),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_store_external_google ON store_external_mapping(google_place_id) WHERE google_place_id IS NOT NULL;

-- ============================================
-- 6. GOOGLE REVIEWS CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS google_reviews_cache (
  google_place_id VARCHAR(100) PRIMARY KEY,
  rating DECIMAL(2,1),
  review_count INT,
  reviews JSONB DEFAULT '[]',
  price_level INT,
  opening_hours JSONB,
  fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_google_reviews_fetched ON google_reviews_cache(fetched_at);

-- ============================================
-- 7. COMBINED STORE RATINGS
-- ============================================

CREATE TABLE IF NOT EXISTS store_combined_ratings (
  store_id VARCHAR(100) PRIMARY KEY,
  mangwale_rating DECIMAL(2,1) DEFAULT 0,
  mangwale_review_count INT DEFAULT 0,
  google_rating DECIMAL(2,1),
  google_review_count INT,
  zomato_rating DECIMAL(2,1),
  zomato_review_count INT,
  combined_rating DECIMAL(2,1) DEFAULT 0,
  combined_review_count INT DEFAULT 0,
  top_positives TEXT[] DEFAULT '{}',
  top_negatives TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. FESTIVAL CALENDAR
-- ============================================

CREATE TABLE IF NOT EXISTS festivals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_hindi VARCHAR(100),
  date DATE NOT NULL,
  year INT NOT NULL,
  foods TEXT[] DEFAULT '{}',
  is_national BOOLEAN DEFAULT false,
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_festivals_date ON festivals(name, year);

-- Insert 2025 festivals
INSERT INTO festivals (name, name_hindi, date, year, foods, is_national) VALUES
  ('Makar Sankranti', 'मकर संक्रांति', '2025-01-14', 2025, ARRAY['Til ladoo', 'Gajak', 'Khichdi'], true),
  ('Republic Day', 'गणतंत्र दिवस', '2025-01-26', 2025, ARRAY['Mithai', 'Samosa'], true),
  ('Holi', 'होली', '2025-03-14', 2025, ARRAY['Gujiya', 'Thandai', 'Malpua'], true),
  ('Gudi Padwa', 'गुड़ी पड़वा', '2025-03-30', 2025, ARRAY['Puran Poli', 'Shrikhand'], false),
  ('Eid ul-Fitr', 'ईद उल-फ़ित्र', '2025-03-31', 2025, ARRAY['Biryani', 'Sewai', 'Kebabs'], true),
  ('Raksha Bandhan', 'रक्षा बंधन', '2025-08-09', 2025, ARRAY['Mithai', 'Kheer'], true),
  ('Janmashtami', 'जन्माष्टमी', '2025-08-16', 2025, ARRAY['Makhan', 'Panjiri', 'Kheer'], true),
  ('Ganesh Chaturthi', 'गणेश चतुर्थी', '2025-08-27', 2025, ARRAY['Modak', 'Puran Poli'], true),
  ('Navratri', 'नवरात्रि', '2025-09-22', 2025, ARRAY['Sabudana Khichdi', 'Kuttu Puri', 'Fruits'], true),
  ('Dussehra', 'दशहरा', '2025-10-02', 2025, ARRAY['Jalebi', 'Fafda'], true),
  ('Diwali', 'दीपावली', '2025-10-21', 2025, ARRAY['Mithai', 'Chakli', 'Karanji', 'Dry Fruits'], true),
  ('Christmas', 'क्रिसमस', '2025-12-25', 2025, ARRAY['Cake', 'Plum Cake', 'Biryani'], true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. DATA SOURCE USAGE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS data_source_usage (
  id SERIAL PRIMARY KEY,
  source_id UUID REFERENCES data_sources(id),
  date DATE DEFAULT CURRENT_DATE,
  request_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  avg_latency_ms INT,
  UNIQUE(source_id, date)
);

CREATE INDEX idx_data_source_usage_date ON data_source_usage(date);

-- ============================================
-- 10. SELF-LEARNING: CONVERSATION MISTAKES
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_mistakes (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(100),
  session_id VARCHAR(100),
  message_hash VARCHAR(64),  -- For pattern detection
  user_message TEXT NOT NULL,
  predicted_intent VARCHAR(50),
  actual_intent VARCHAR(50),
  confidence DECIMAL(3,2),
  mistake_type VARCHAR(30),  -- 'wrong_intent', 'missed_entity', 'bad_response', 'flow_failure', 'user_correction'
  user_feedback TEXT,
  channel VARCHAR(20),  -- 'whatsapp', 'voice', 'web'
  is_resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_by VARCHAR(100),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mistakes_hash ON conversation_mistakes(message_hash);
CREATE INDEX idx_mistakes_type ON conversation_mistakes(mistake_type);
CREATE INDEX idx_mistakes_unresolved ON conversation_mistakes(is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_mistakes_created ON conversation_mistakes(created_at);

-- ============================================
-- 11. SELF-LEARNING: PATTERN DETECTION VIEW
-- ============================================

CREATE OR REPLACE VIEW v_mistake_patterns AS
SELECT 
  message_hash,
  user_message,
  predicted_intent,
  mistake_type,
  COUNT(*) as occurrence_count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  COUNT(CASE WHEN is_resolved THEN 1 END) as resolved_count
FROM conversation_mistakes
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY message_hash, user_message, predicted_intent, mistake_type
HAVING COUNT(*) >= 3
ORDER BY occurrence_count DESC;

-- ============================================
-- 12. NLU TRAINING DATA (Auto-generated)
-- ============================================

CREATE TABLE IF NOT EXISTS nlu_training_data (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  intent VARCHAR(50) NOT NULL,
  entities JSONB DEFAULT '[]',
  source VARCHAR(30),  -- 'user_correction', 'manual', 'high_confidence', 'pattern'
  confidence DECIMAL(3,2),
  is_approved BOOLEAN DEFAULT false,
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  is_used_in_training BOOLEAN DEFAULT false,
  trained_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_data_intent ON nlu_training_data(intent);
CREATE INDEX idx_training_data_approved ON nlu_training_data(is_approved, is_used_in_training);

-- ============================================
-- 13. MODEL PERFORMANCE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS model_performance (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(100),
  model_version VARCHAR(50),
  date DATE DEFAULT CURRENT_DATE,
  total_predictions INT DEFAULT 0,
  correct_predictions INT DEFAULT 0,
  accuracy DECIMAL(5,4),
  avg_confidence DECIMAL(3,2),
  low_confidence_count INT DEFAULT 0,
  intent_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(model_name, model_version, date)
);

-- ============================================
-- 14. HELPFUL FUNCTIONS
-- ============================================

-- Function to log data source usage
CREATE OR REPLACE FUNCTION log_data_source_call(
  p_source_id UUID,
  p_success BOOLEAN,
  p_latency_ms INT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO data_source_usage (source_id, date, request_count, success_count, error_count, avg_latency_ms)
  VALUES (p_source_id, CURRENT_DATE, 1, 
          CASE WHEN p_success THEN 1 ELSE 0 END,
          CASE WHEN p_success THEN 0 ELSE 1 END,
          p_latency_ms)
  ON CONFLICT (source_id, date) DO UPDATE SET
    request_count = data_source_usage.request_count + 1,
    success_count = data_source_usage.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    error_count = data_source_usage.error_count + CASE WHEN p_success THEN 0 ELSE 1 END,
    avg_latency_ms = (data_source_usage.avg_latency_ms * data_source_usage.request_count + p_latency_ms) / (data_source_usage.request_count + 1);
END;
$$ LANGUAGE plpgsql;

-- Function to get best available source
CREATE OR REPLACE FUNCTION get_best_data_source(p_type VARCHAR)
RETURNS TABLE(id UUID, provider VARCHAR, endpoint VARCHAR, api_key TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ds.id, ds.provider, ds.endpoint, ds.api_key
  FROM data_sources ds
  WHERE ds.type = p_type 
    AND ds.is_active = true
    AND (ds.rate_limit_per_day IS NULL OR ds.calls_today < ds.rate_limit_per_day)
  ORDER BY ds.priority ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 15. COMMENTS
-- ============================================

COMMENT ON TABLE data_sources IS 'Registry of external data sources with priority-based fallback';
COMMENT ON TABLE user_preferences IS 'User preferences for personalization (food, communication)';
COMMENT ON TABLE city_knowledge IS 'Local knowledge base for cities (slang, dishes, tips)';
COMMENT ON TABLE store_external_mapping IS 'Maps our stores to external providers (Google, Zomato)';
COMMENT ON TABLE conversation_mistakes IS 'Tracks NLU/bot mistakes for self-learning';
COMMENT ON TABLE nlu_training_data IS 'Auto-generated training samples from user corrections';
COMMENT ON VIEW v_mistake_patterns IS 'Identifies recurring mistakes (3+ occurrences) for prioritization';
