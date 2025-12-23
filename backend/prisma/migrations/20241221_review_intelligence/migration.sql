-- Review Intelligence Tables
-- Stores analyzed review data from PHP + Google NL API insights

-- =============================================================================
-- ITEM REVIEW INTELLIGENCE
-- Stores aspect-based sentiment analysis for each food item
-- =============================================================================
CREATE TABLE IF NOT EXISTS item_review_intelligence (
  item_id VARCHAR(100) PRIMARY KEY,
  store_id VARCHAR(100) NOT NULL,
  
  -- Overall sentiment
  overall_sentiment JSONB NOT NULL DEFAULT '{
    "score": 0,
    "label": "neutral",
    "magnitude": 0
  }',
  
  -- Aspect-based sentiments (quantity, taste, spiciness, etc.)
  aspects JSONB NOT NULL DEFAULT '{}',
  -- Example:
  -- {
  --   "quantity": {"sentiment": "negative", "score": -0.6, "mentionCount": 15, "samplePhrases": ["kam quantity"]},
  --   "taste": {"sentiment": "positive", "score": 0.8, "mentionCount": 45, "samplePhrases": ["bahut tasty"]},
  --   "spiciness": {"sentiment": "negative", "score": -0.4, "mentionCount": 8, "samplePhrases": ["bahut teekha"]}
  -- }
  
  -- Key insights for Chotu
  top_praises TEXT[] DEFAULT '{}',       -- ["Great taste", "Fast delivery"]
  top_complaints TEXT[] DEFAULT '{}',    -- ["Quantity kam hai", "Too oily"]
  
  -- Warning flags for proactive communication
  warnings JSONB NOT NULL DEFAULT '{
    "quantityIssue": false,
    "spicyWarning": false,
    "oilyWarning": false,
    "lateDelivery": false
  }',
  
  -- Statistics
  total_reviews_analyzed INT DEFAULT 0,
  positive_review_count INT DEFAULT 0,
  negative_review_count INT DEFAULT 0,
  neutral_review_count INT DEFAULT 0,
  
  -- Metadata
  last_analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_review_intel_store ON item_review_intelligence(store_id);
CREATE INDEX IF NOT EXISTS idx_review_intel_sentiment ON item_review_intelligence((overall_sentiment->>'score'));
CREATE INDEX IF NOT EXISTS idx_review_intel_warnings ON item_review_intelligence USING GIN (warnings);

-- =============================================================================
-- STORE REVIEW INTELLIGENCE
-- Aggregated review insights at restaurant/store level
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_review_intelligence (
  store_id VARCHAR(100) PRIMARY KEY,
  store_name VARCHAR(255),
  
  -- Overall store sentiment
  overall_sentiment JSONB NOT NULL DEFAULT '{"score": 0, "label": "neutral"}',
  
  -- Category-wise ratings
  category_ratings JSONB NOT NULL DEFAULT '{
    "food_quality": null,
    "delivery_speed": null,
    "packaging": null,
    "value_for_money": null,
    "customer_service": null
  }',
  
  -- Top performing items (based on reviews)
  top_rated_items JSONB DEFAULT '[]',
  -- [{"itemId": "123", "name": "Paneer Tikka", "score": 0.9, "reviewCount": 50}]
  
  -- Problem items (items with consistent complaints)
  problem_items JSONB DEFAULT '[]',
  -- [{"itemId": "456", "name": "Dal Fry", "issue": "quantity", "complaintCount": 20}]
  
  -- Common praises and complaints for the store
  common_praises TEXT[] DEFAULT '{}',
  common_complaints TEXT[] DEFAULT '{}',
  
  -- Peak hours analysis (when reviews mention fast/slow)
  delivery_time_insights JSONB DEFAULT '{}',
  -- {"peakHours": ["12:00-14:00", "19:00-21:00"], "avgDeliveryMentions": "fast"}
  
  -- Stats
  total_reviews INT DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  
  -- Timestamps
  last_analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- REVIEW SYNC LOG
-- Track which reviews have been synced from PHP and analyzed
-- =============================================================================
CREATE TABLE IF NOT EXISTS review_sync_log (
  id SERIAL PRIMARY KEY,
  
  -- Source info
  php_review_id INT NOT NULL UNIQUE,
  item_id VARCHAR(100),
  store_id VARCHAR(100),
  
  -- Review data (cached from PHP)
  customer_name VARCHAR(255),
  rating INT,
  comment TEXT,
  review_date TIMESTAMP,
  
  -- Analysis results
  sentiment_score DECIMAL(4,3),  -- -1.000 to 1.000
  sentiment_label VARCHAR(20),   -- positive/negative/neutral/mixed
  extracted_aspects JSONB DEFAULT '{}',
  language_detected VARCHAR(20), -- hi, en, hinglish
  
  -- Processing status
  is_analyzed BOOLEAN DEFAULT false,
  analysis_method VARCHAR(20),   -- 'google_api' or 'local'
  analyzed_at TIMESTAMP,
  
  -- Timestamps
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_item ON review_sync_log(item_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_store ON review_sync_log(store_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_analyzed ON review_sync_log(is_analyzed);

-- =============================================================================
-- ASPECT KEYWORDS CONFIG
-- Configurable keywords for aspect detection (can be updated via admin)
-- =============================================================================
CREATE TABLE IF NOT EXISTS review_aspect_keywords (
  id SERIAL PRIMARY KEY,
  aspect_name VARCHAR(50) NOT NULL,  -- quantity, taste, spiciness, etc.
  
  -- Keywords in different languages
  keywords_en TEXT[] DEFAULT '{}',    -- English keywords
  keywords_hi TEXT[] DEFAULT '{}',    -- Hindi keywords
  keywords_hinglish TEXT[] DEFAULT '{}', -- Hinglish mixed
  
  -- Positive/negative indicators
  positive_indicators TEXT[] DEFAULT '{}',
  negative_indicators TEXT[] DEFAULT '{}',
  
  -- Weight for scoring
  importance_weight DECIMAL(3,2) DEFAULT 1.0,
  
  -- Active flag
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(aspect_name)
);

-- Insert default aspect keywords
INSERT INTO review_aspect_keywords (aspect_name, keywords_en, keywords_hi, keywords_hinglish, positive_indicators, negative_indicators, importance_weight)
VALUES 
  ('quantity', 
   ARRAY['quantity', 'portion', 'size', 'amount', 'serving'],
   ARRAY['matra', 'quantity'],
   ARRAY['kam', 'zyada', 'bahut kam', 'thoda', 'portion size'],
   ARRAY['enough', 'sufficient', 'zyada', 'bahut', 'good portion', 'large', 'generous'],
   ARRAY['kam', 'less', 'small', 'thoda', 'insufficient', 'not enough', 'chhota', 'tiny'],
   1.2),
   
  ('taste',
   ARRAY['taste', 'flavor', 'delicious', 'tasty', 'yummy'],
   ARRAY['swad', 'swaad', 'maza'],
   ARRAY['achha', 'bura', 'badhiya', 'zabardast', 'mast'],
   ARRAY['delicious', 'tasty', 'yummy', 'achha', 'badhiya', 'zabardast', 'mast', 'great taste', 'amazing'],
   ARRAY['tasteless', 'bad taste', 'bekaar', 'ganda', 'not good', 'bland', 'awful'],
   1.5),
   
  ('spiciness',
   ARRAY['spicy', 'spice', 'hot', 'mild', 'chilli'],
   ARRAY['teekha', 'mirchi', 'tikha'],
   ARRAY['jal', 'burning', 'teekha hai'],
   ARRAY['perfect spice', 'mild', 'not too spicy', 'balanced', 'just right'],
   ARRAY['too spicy', 'bahut teekha', 'very hot', 'burning', 'mirchi zyada', 'jal gaya', 'mouth burning'],
   1.0),
   
  ('freshness',
   ARRAY['fresh', 'stale', 'old', 'warm', 'hot', 'cold'],
   ARRAY['taza', 'taaza', 'baasi', 'garam', 'thanda'],
   ARRAY['fresh hai', 'garam mila', 'thanda tha'],
   ARRAY['fresh', 'taza', 'hot', 'garam', 'warm', 'piping hot'],
   ARRAY['stale', 'baasi', 'cold', 'thanda', 'not fresh', 'old', 'soggy'],
   1.3),
   
  ('packaging',
   ARRAY['packaging', 'packing', 'container', 'box', 'spill', 'leak'],
   ARRAY['dabba', 'packet'],
   ARRAY['spill ho gaya', 'leak', 'damaged'],
   ARRAY['good packaging', 'well packed', 'sealed', 'no spill', 'intact'],
   ARRAY['spill', 'leak', 'damaged', 'poor packaging', 'gir gaya', 'kharab', 'broken'],
   0.8),
   
  ('delivery',
   ARRAY['delivery', 'late', 'fast', 'quick', 'slow', 'time', 'rider'],
   ARRAY['der', 'jaldi'],
   ARRAY['late aaya', 'on time', 'jaldi aa gaya'],
   ARRAY['fast', 'quick', 'on time', 'jaldi', 'early', 'prompt', 'speedy'],
   ARRAY['late', 'slow', 'der', 'delayed', 'took long', 'bahut der', 'waiting'],
   1.0),
   
  ('value',
   ARRAY['price', 'value', 'worth', 'expensive', 'cheap', 'cost', 'money'],
   ARRAY['paisa', 'mehenga', 'sasta', 'kimat'],
   ARRAY['paisa wasool', 'affordable', 'overpriced'],
   ARRAY['paisa wasool', 'worth it', 'good value', 'sasta', 'affordable', 'reasonable', 'great deal'],
   ARRAY['expensive', 'mehenga', 'overpriced', 'not worth', 'too costly', 'waste of money', 'ripoff'],
   1.1),
   
  ('oiliness',
   ARRAY['oily', 'greasy', 'oil', 'fat', 'light', 'heavy'],
   ARRAY['tel', 'ghee', 'chikna'],
   ARRAY['oily hai', 'tel zyada', 'heavy feeling'],
   ARRAY['light', 'healthy', 'not oily', 'kam tel', 'balanced', 'less oil'],
   ARRAY['oily', 'greasy', 'too much oil', 'tel zyada', 'heavy', 'fatty', 'dripping oil'],
   1.0)
ON CONFLICT (aspect_name) DO UPDATE SET
  keywords_en = EXCLUDED.keywords_en,
  keywords_hi = EXCLUDED.keywords_hi,
  keywords_hinglish = EXCLUDED.keywords_hinglish,
  positive_indicators = EXCLUDED.positive_indicators,
  negative_indicators = EXCLUDED.negative_indicators,
  importance_weight = EXCLUDED.importance_weight,
  updated_at = NOW();

-- =============================================================================
-- VIEWS FOR DATA WAREHOUSE / ANALYTICS
-- =============================================================================

-- View: Items with review issues (for vendor dashboard)
CREATE OR REPLACE VIEW v_items_needing_attention AS
SELECT 
  i.item_id,
  i.store_id,
  i.overall_sentiment->>'label' as sentiment_label,
  (i.overall_sentiment->>'score')::decimal as sentiment_score,
  i.warnings->>'quantityIssue' = 'true' as has_quantity_issue,
  i.warnings->>'spicyWarning' = 'true' as has_spicy_warning,
  i.warnings->>'oilyWarning' = 'true' as has_oily_warning,
  i.total_reviews_analyzed,
  i.top_complaints,
  i.last_analyzed_at
FROM item_review_intelligence i
WHERE 
  (i.overall_sentiment->>'score')::decimal < -0.2
  OR i.warnings->>'quantityIssue' = 'true'
  OR i.warnings->>'oilyWarning' = 'true'
ORDER BY (i.overall_sentiment->>'score')::decimal ASC;

-- View: Store performance summary
CREATE OR REPLACE VIEW v_store_performance AS
SELECT 
  s.store_id,
  s.store_name,
  s.overall_sentiment->>'label' as sentiment,
  s.avg_rating,
  s.total_reviews,
  jsonb_array_length(s.top_rated_items) as top_items_count,
  jsonb_array_length(s.problem_items) as problem_items_count,
  s.common_praises[1:3] as sample_praises,
  s.common_complaints[1:3] as sample_complaints,
  s.last_analyzed_at
FROM store_review_intelligence s
ORDER BY s.avg_rating DESC;

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_review_intelligence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_item_review_intel_updated ON item_review_intelligence;
CREATE TRIGGER trg_item_review_intel_updated
  BEFORE UPDATE ON item_review_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_review_intelligence_timestamp();

DROP TRIGGER IF EXISTS trg_store_review_intel_updated ON store_review_intelligence;
CREATE TRIGGER trg_store_review_intel_updated
  BEFORE UPDATE ON store_review_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_review_intelligence_timestamp();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE item_review_intelligence IS 'Stores AI-analyzed review insights for food items. Populated by ReviewIntelligenceService using Google NL API or local analysis.';
COMMENT ON TABLE store_review_intelligence IS 'Aggregated review intelligence at store/restaurant level.';
COMMENT ON TABLE review_sync_log IS 'Tracks reviews synced from PHP backend and their analysis status.';
COMMENT ON TABLE review_aspect_keywords IS 'Configurable keywords for aspect-based sentiment detection. Supports Hindi, English, and Hinglish.';
COMMENT ON VIEW v_items_needing_attention IS 'Items with negative sentiment or active warnings - useful for vendor dashboard.';
COMMENT ON VIEW v_store_performance IS 'Store-level performance summary for analytics.';
