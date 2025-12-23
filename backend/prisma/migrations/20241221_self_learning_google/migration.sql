-- Self-Learning & Google Integration Tables
-- For mistake tracking, pattern detection, and external data enrichment

-- =============================================================================
-- CONVERSATION MISTAKES
-- Track all mistakes for learning and pattern detection
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversation_mistakes (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100),
  phone_number VARCHAR(50),
  message_hash VARCHAR(64) NOT NULL,  -- For pattern matching
  
  -- Message details
  user_message TEXT NOT NULL,
  predicted_intent VARCHAR(50),
  actual_intent VARCHAR(50),       -- If user corrected or we learned
  confidence DECIMAL(3,2),
  
  -- Mistake classification
  mistake_type VARCHAR(30) NOT NULL,  -- wrong_intent, missed_entity, bad_response, flow_failure, user_correction
  error_details TEXT,
  user_feedback TEXT,
  
  -- Flow context
  flow_id VARCHAR(100),
  flow_state VARCHAR(100),
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mistakes_hash ON conversation_mistakes(message_hash);
CREATE INDEX IF NOT EXISTS idx_mistakes_type ON conversation_mistakes(mistake_type);
CREATE INDEX IF NOT EXISTS idx_mistakes_unresolved ON conversation_mistakes(is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_mistakes_session ON conversation_mistakes(session_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_created ON conversation_mistakes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mistakes_intent ON conversation_mistakes(predicted_intent, actual_intent);

-- =============================================================================
-- MODEL PERFORMANCE TRACKING
-- Track NLU model accuracy over time
-- =============================================================================
CREATE TABLE IF NOT EXISTS model_performance (
  id SERIAL PRIMARY KEY,
  model_version VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  
  -- Overall metrics
  total_predictions INT DEFAULT 0,
  correct_predictions INT DEFAULT 0,
  accuracy DECIMAL(5,4),
  avg_confidence DECIMAL(3,2),
  
  -- Error breakdown
  false_positives INT DEFAULT 0,
  false_negatives INT DEFAULT 0,
  low_confidence_count INT DEFAULT 0,
  
  -- Per-intent breakdown
  intents_breakdown JSONB DEFAULT '{}',
  -- Example: {"order_food": {"total": 100, "correct": 95, "accuracy": 0.95}}
  
  -- Environment
  environment VARCHAR(20) DEFAULT 'production',  -- production, staging, test
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(model_version, date, environment)
);

CREATE INDEX IF NOT EXISTS idx_model_perf_version ON model_performance(model_version);
CREATE INDEX IF NOT EXISTS idx_model_perf_date ON model_performance(date DESC);

-- =============================================================================
-- GOOGLE PLACES STORE MAPPING
-- Map our stores to Google Place IDs for external reviews
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_google_mapping (
  store_id VARCHAR(100) PRIMARY KEY,
  google_place_id VARCHAR(100),
  
  -- Google data (cached)
  google_rating DECIMAL(2,1),
  google_review_count INT DEFAULT 0,
  google_price_level INT,  -- 0-4
  
  -- Matching info
  match_confidence DECIMAL(3,2),
  match_method VARCHAR(30),  -- 'name_match', 'address_match', 'manual'
  
  -- Sync status
  last_synced_at TIMESTAMP,
  sync_error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_mapping_place ON store_google_mapping(google_place_id);
CREATE INDEX IF NOT EXISTS idx_google_mapping_sync ON store_google_mapping(last_synced_at);

-- =============================================================================
-- GOOGLE REVIEWS CACHE
-- Cache Google reviews for analysis and display
-- =============================================================================
CREATE TABLE IF NOT EXISTS google_reviews_cache (
  id SERIAL PRIMARY KEY,
  google_place_id VARCHAR(100) NOT NULL,
  
  -- Review content
  author_name VARCHAR(255),
  rating INT NOT NULL,  -- 1-5
  text TEXT,
  review_time TIMESTAMP,
  relative_time VARCHAR(100),  -- "2 months ago"
  language VARCHAR(10),
  
  -- AI analysis (from Google NL API)
  sentiment_score DECIMAL(3,2),  -- -1 to 1
  aspects JSONB DEFAULT '{}',    -- {taste: positive, quantity: negative}
  
  -- Sync info
  synced_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(google_place_id, author_name, review_time)
);

CREATE INDEX IF NOT EXISTS idx_google_reviews_place ON google_reviews_cache(google_place_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_rating ON google_reviews_cache(rating);

-- =============================================================================
-- NLU TRAINING DATA
-- Approved training samples for model improvement
-- =============================================================================
CREATE TABLE IF NOT EXISTS nlu_training_data (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  intent VARCHAR(50) NOT NULL,
  entities JSONB DEFAULT '[]',  -- [{type: 'food_item', value: 'pizza', start: 10, end: 15}]
  
  -- Source info
  source VARCHAR(50),  -- 'user_correction', 'label_studio', 'manual', 'auto_approved'
  source_message_id VARCHAR(100),
  
  -- Confidence
  confidence DECIMAL(3,2) DEFAULT 1.0,
  
  -- Review status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,
  
  -- Training status
  used_in_training BOOLEAN DEFAULT false,
  training_batch VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(text, intent)
);

CREATE INDEX IF NOT EXISTS idx_training_data_intent ON nlu_training_data(intent);
CREATE INDEX IF NOT EXISTS idx_training_data_status ON nlu_training_data(status);
CREATE INDEX IF NOT EXISTS idx_training_data_source ON nlu_training_data(source);

-- =============================================================================
-- VOICE TRANSCRIPTIONS LOG
-- Track voice transcriptions for quality improvement
-- =============================================================================
CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id SERIAL PRIMARY KEY,
  audio_id VARCHAR(100),
  session_id VARCHAR(100),
  
  -- Transcription
  transcription TEXT NOT NULL,
  asr_provider VARCHAR(30),  -- whisper, indicconformer, google
  asr_confidence DECIMAL(3,2),
  language_detected VARCHAR(10),
  
  -- NLU result
  nlu_intent VARCHAR(50),
  nlu_confidence DECIMAL(3,2),
  nlu_entities JSONB DEFAULT '[]',
  
  -- Corrections
  user_correction TEXT,
  corrected_intent VARCHAR(50),
  
  -- Review status
  needs_review BOOLEAN DEFAULT false,
  review_reason VARCHAR(50),  -- low_asr_confidence, low_nlu_confidence, user_correction
  reviewed BOOLEAN DEFAULT false,
  
  -- Audio reference (for replay)
  audio_url TEXT,
  audio_duration_ms INT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_trans_session ON voice_transcriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_trans_review ON voice_transcriptions(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_voice_trans_provider ON voice_transcriptions(asr_provider);

-- =============================================================================
-- COMBINED REVIEW STATS VIEW
-- Combine Mangwale + Google reviews for unified view
-- =============================================================================
CREATE OR REPLACE VIEW v_combined_store_ratings AS
SELECT 
  s.store_id,
  COALESCE(ri.total_reviews, 0) as mangwale_reviews,
  COALESCE((ri.overall_sentiment->>'score')::decimal * 2.5 + 2.5, 0) as mangwale_rating,
  g.google_review_count,
  g.google_rating,
  -- Combined weighted rating
  CASE 
    WHEN COALESCE(ri.total_reviews, 0) + COALESCE(g.google_review_count, 0) > 0 THEN
      (COALESCE((ri.overall_sentiment->>'score')::decimal * 2.5 + 2.5, 0) * COALESCE(ri.total_reviews, 0) +
       COALESCE(g.google_rating, 0) * COALESCE(g.google_review_count, 0)) /
      (COALESCE(ri.total_reviews, 0) + COALESCE(g.google_review_count, 0))
    ELSE 0
  END as combined_rating,
  COALESCE(ri.total_reviews, 0) + COALESCE(g.google_review_count, 0) as total_reviews,
  g.last_synced_at as google_last_sync
FROM store_google_mapping g
LEFT JOIN store_review_intelligence ri ON ri.store_id = g.store_id
LEFT JOIN (SELECT DISTINCT store_id FROM item_review_intelligence) s ON s.store_id = g.store_id;

-- =============================================================================
-- MISTAKE PATTERNS VIEW
-- Aggregate mistake patterns for dashboard
-- =============================================================================
CREATE OR REPLACE VIEW v_mistake_patterns AS
SELECT 
  message_hash,
  mistake_type,
  COUNT(*) as occurrence_count,
  array_agg(DISTINCT user_message ORDER BY user_message) as sample_messages,
  array_agg(DISTINCT predicted_intent) as predicted_intents,
  array_agg(DISTINCT actual_intent) FILTER (WHERE actual_intent IS NOT NULL) as actual_intents,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence,
  bool_and(is_resolved) as all_resolved
FROM conversation_mistakes
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY message_hash, mistake_type
HAVING COUNT(*) >= 2
ORDER BY occurrence_count DESC;

-- =============================================================================
-- DAILY MODEL ACCURACY VIEW
-- Track model accuracy trends
-- =============================================================================
CREATE OR REPLACE VIEW v_daily_model_accuracy AS
SELECT 
  date,
  model_version,
  accuracy,
  total_predictions,
  correct_predictions,
  avg_confidence,
  false_positives + false_negatives as total_errors
FROM model_performance
WHERE date > CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at for store_google_mapping
CREATE OR REPLACE FUNCTION update_google_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_google_mapping_updated ON store_google_mapping;
CREATE TRIGGER trg_google_mapping_updated
  BEFORE UPDATE ON store_google_mapping
  FOR EACH ROW EXECUTE FUNCTION update_google_mapping_timestamp();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE conversation_mistakes IS 'Tracks NLU mistakes and flow failures for self-learning. Used by MistakeTrackerService.';
COMMENT ON TABLE model_performance IS 'Daily NLU model performance metrics. Tracked by auto-retrain pipeline.';
COMMENT ON TABLE store_google_mapping IS 'Maps Mangwale stores to Google Place IDs for external review integration.';
COMMENT ON TABLE google_reviews_cache IS 'Cached Google reviews with sentiment analysis.';
COMMENT ON TABLE nlu_training_data IS 'Approved training samples for NLU model improvement.';
COMMENT ON TABLE voice_transcriptions IS 'Voice transcription logs for ASR/NLU quality tracking.';
COMMENT ON VIEW v_combined_store_ratings IS 'Combined Mangwale + Google ratings for stores.';
COMMENT ON VIEW v_mistake_patterns IS 'Aggregated mistake patterns for analysis and retraining.';
