-- ===================================
-- CROWDSOURCED MARKET RESEARCH SYSTEM
-- ===================================
-- Users suggest stores/features → Others validate demand
-- Viral loop: One user's answer becomes another's question

-- ===================================
-- USER STORE REQUESTS (What users want on Mangwale)
-- ===================================
CREATE TABLE IF NOT EXISTS user_store_requests (
  id SERIAL PRIMARY KEY,
  
  -- Requester
  requested_by_user_id INTEGER NOT NULL,
  session_id VARCHAR(100), -- Game session where request was made
  
  -- Store/Service Details
  store_name VARCHAR(200) NOT NULL,
  store_type VARCHAR(100), -- restaurant, grocery, pharmacy, electronics, etc.
  store_category VARCHAR(100), -- fast_food, veg_restaurant, local_kirana, branded_chain
  
  -- Location Context
  city VARCHAR(100) DEFAULT 'Nashik',
  area VARCHAR(100), -- Specific locality
  
  -- User's Reasoning
  reason TEXT, -- Why they want this store
  use_case TEXT, -- How they would use it
  frequency_estimate VARCHAR(50), -- daily, weekly, monthly, occasionally
  
  -- Validation by Other Users
  total_validations INTEGER DEFAULT 0, -- How many users also want this
  validation_score INTEGER DEFAULT 0, -- Weighted score based on user engagement
  
  -- Current Status
  status VARCHAR(50) DEFAULT 'pending_validation', -- pending_validation, validated, under_review, approved, rejected, onboarded
  
  -- Business Priority
  business_priority VARCHAR(20), -- low, medium, high, critical
  assigned_to VARCHAR(100), -- Team member reviewing this
  internal_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  validated_at TIMESTAMP, -- When it reached validation threshold
  
  FOREIGN KEY (requested_by_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_store_requests_status ON user_store_requests(status, validation_score DESC);
CREATE INDEX idx_store_requests_city ON user_store_requests(city, store_type);
CREATE INDEX idx_store_requests_created ON user_store_requests(created_at DESC);

-- ===================================
-- STORE REQUEST VALIDATIONS (Others voting/validating)
-- ===================================
CREATE TABLE IF NOT EXISTS store_request_validations (
  id SERIAL PRIMARY KEY,
  
  -- Which request is being validated
  store_request_id INTEGER NOT NULL,
  
  -- Who is validating
  validated_by_user_id INTEGER NOT NULL,
  game_session_id INTEGER, -- Game session where validation happened
  
  -- Validation Response
  would_use BOOLEAN NOT NULL, -- YES/NO: Would you use this store?
  frequency VARCHAR(50), -- How often? daily, weekly, monthly, rarely
  willingness_to_pay VARCHAR(50), -- Same as others, slightly more, premium pricing
  
  -- Additional Context
  additional_comments TEXT, -- Free text feedback
  alternative_suggestion VARCHAR(200), -- If NO, suggest alternative
  
  -- Reward Given
  reward_config_id INTEGER REFERENCES reward_config(id),
  wallet_reward DECIMAL(10,2) DEFAULT 0,
  loyalty_points_reward INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(store_request_id, validated_by_user_id), -- One validation per user per request
  FOREIGN KEY (store_request_id) REFERENCES user_store_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_validations_request ON store_request_validations(store_request_id);
CREATE INDEX idx_validations_user ON store_request_validations(validated_by_user_id);

-- ===================================
-- FEATURE REQUESTS (Similar crowdsourced validation)
-- ===================================
CREATE TABLE IF NOT EXISTS user_feature_requests (
  id SERIAL PRIMARY KEY,
  
  requested_by_user_id INTEGER NOT NULL,
  session_id VARCHAR(100),
  
  -- Feature Details
  feature_title VARCHAR(200) NOT NULL,
  feature_description TEXT NOT NULL,
  feature_category VARCHAR(100), -- delivery, payment, ui, tracking, communication
  
  -- Use Case
  problem_it_solves TEXT, -- What problem does this solve?
  target_user_type VARCHAR(50), -- student, working_professional, homemaker, business_owner
  
  -- Validation
  total_votes INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  validation_score INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending_validation',
  business_priority VARCHAR(20),
  estimated_effort VARCHAR(50), -- quick_win, small, medium, large, very_large
  assigned_to VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (requested_by_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_feature_requests_score ON user_feature_requests(validation_score DESC, created_at DESC);
CREATE INDEX idx_feature_requests_status ON user_feature_requests(status);

-- ===================================
-- FEATURE REQUEST VOTES
-- ===================================
CREATE TABLE IF NOT EXISTS feature_request_votes (
  id SERIAL PRIMARY KEY,
  
  feature_request_id INTEGER NOT NULL,
  voted_by_user_id INTEGER NOT NULL,
  game_session_id INTEGER,
  
  vote_type VARCHAR(20) NOT NULL, -- upvote, downvote, neutral
  would_use BOOLEAN,
  priority_for_me VARCHAR(20), -- critical, high, medium, low
  
  feedback TEXT,
  
  reward_config_id INTEGER REFERENCES reward_config(id),
  wallet_reward DECIMAL(10,2) DEFAULT 0,
  loyalty_points_reward INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(feature_request_id, voted_by_user_id),
  FOREIGN KEY (feature_request_id) REFERENCES user_feature_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (voted_by_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_feature_votes_request ON feature_request_votes(feature_request_id);

-- ===================================
-- PAIN POINTS (Crowdsourced problem identification)
-- ===================================
CREATE TABLE IF NOT EXISTS user_pain_points (
  id SERIAL PRIMARY KEY,
  
  reported_by_user_id INTEGER NOT NULL,
  session_id VARCHAR(100),
  
  -- Pain Point
  pain_point_title VARCHAR(200) NOT NULL,
  pain_point_description TEXT NOT NULL,
  affected_service VARCHAR(100), -- delivery, food_ordering, parcel_booking, payment, customer_support
  
  -- Context
  frequency VARCHAR(50), -- How often does this happen? always, often, sometimes, rarely
  severity VARCHAR(20), -- critical, high, medium, low
  
  -- Validation (Do others face this too?)
  total_confirmations INTEGER DEFAULT 0, -- How many others confirmed same issue
  
  -- Resolution
  status VARCHAR(50) DEFAULT 'reported', -- reported, confirmed, under_investigation, resolved, wont_fix
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reported_by_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_pain_points_status ON user_pain_points(status, total_confirmations DESC);

-- ===================================
-- PAIN POINT CONFIRMATIONS (Others saying "me too!")
-- ===================================
CREATE TABLE IF NOT EXISTS pain_point_confirmations (
  id SERIAL PRIMARY KEY,
  
  pain_point_id INTEGER NOT NULL,
  confirmed_by_user_id INTEGER NOT NULL,
  game_session_id INTEGER,
  
  also_faced BOOLEAN NOT NULL, -- Do you also face this issue?
  frequency VARCHAR(50), -- How often for you?
  additional_context TEXT,
  
  reward_config_id INTEGER REFERENCES reward_config(id),
  wallet_reward DECIMAL(10,2) DEFAULT 0,
  loyalty_points_reward INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(pain_point_id, confirmed_by_user_id),
  FOREIGN KEY (pain_point_id) REFERENCES user_pain_points(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_pain_confirmations_point ON pain_point_confirmations(pain_point_id);

-- ===================================
-- DYNAMIC MISSION QUEUE (Auto-generated from user submissions)
-- ===================================
CREATE TABLE IF NOT EXISTS dynamic_mission_queue (
  id SERIAL PRIMARY KEY,
  
  -- Mission Source
  source_type VARCHAR(50) NOT NULL, -- store_request, feature_request, pain_point
  source_id INTEGER NOT NULL, -- ID from source table
  
  -- Mission Details
  mission_type VARCHAR(50) NOT NULL, -- validate_store, vote_feature, confirm_pain_point
  mission_title VARCHAR(200) NOT NULL,
  mission_description TEXT NOT NULL,
  
  -- Configuration
  reward_config_name VARCHAR(100), -- Which reward to give
  target_responses_needed INTEGER DEFAULT 10, -- How many validations needed?
  responses_received INTEGER DEFAULT 0,
  
  -- Targeting (Who should see this mission?)
  target_city VARCHAR(100), -- NULL = all cities
  target_user_type VARCHAR(50), -- NULL = all users
  min_user_level INTEGER DEFAULT 1,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- Higher = shown first
  
  -- Validity
  expires_at TIMESTAMP, -- Auto-expire if not enough responses
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP -- When target responses reached
);

CREATE INDEX idx_dynamic_missions_active ON dynamic_mission_queue(active, priority DESC, created_at DESC);
CREATE INDEX idx_dynamic_missions_source ON dynamic_mission_queue(source_type, source_id);

-- ===================================
-- TRIGGERS: Auto-create validation missions
-- ===================================

-- When user requests a store, create validation mission for others
CREATE OR REPLACE FUNCTION create_store_validation_mission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dynamic_mission_queue (
    source_type,
    source_id,
    mission_type,
    mission_title,
    mission_description,
    reward_config_name,
    target_responses_needed,
    target_city,
    priority,
    expires_at
  ) VALUES (
    'store_request',
    NEW.id,
    'validate_store',
    '🏪 Would you use ' || NEW.store_name || '?',
    'Someone requested ' || NEW.store_name || ' in ' || NEW.city || '. Would you order from here if available? Help us understand demand!',
    'validation_reward', -- ₹2 for quick validations
    20, -- Need 20 validations
    NEW.city, -- Show only to users in same city
    1, -- Normal priority
    CURRENT_TIMESTAMP + INTERVAL '7 days' -- Expire in 7 days
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_store_validation
AFTER INSERT ON user_store_requests
FOR EACH ROW
EXECUTE FUNCTION create_store_validation_mission();

-- When feature is requested, create voting mission
CREATE OR REPLACE FUNCTION create_feature_vote_mission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dynamic_mission_queue (
    source_type,
    source_id,
    mission_type,
    mission_title,
    mission_description,
    reward_config_name,
    target_responses_needed,
    priority,
    expires_at
  ) VALUES (
    'feature_request',
    NEW.id,
    'vote_feature',
    '💡 Vote: ' || NEW.feature_title,
    NEW.feature_description || ' - Would you use this feature?',
    'validation_reward',
    30, -- Need 30 votes for features
    2, -- Medium priority
    CURRENT_TIMESTAMP + INTERVAL '14 days'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_feature_vote
AFTER INSERT ON user_feature_requests
FOR EACH ROW
EXECUTE FUNCTION create_feature_vote_mission();

-- ===================================
-- FUNCTIONS: Update validation scores
-- ===================================

-- Update store request validation score
CREATE OR REPLACE FUNCTION update_store_validation_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER;
  v_total INTEGER;
BEGIN
  -- Calculate score: YES votes * 10, NO votes * 1
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN would_use THEN 10 ELSE 1 END) as score
  INTO v_total, v_score
  FROM store_request_validations
  WHERE store_request_id = NEW.store_request_id;
  
  -- Update parent request
  UPDATE user_store_requests
  SET 
    total_validations = v_total,
    validation_score = v_score,
    status = CASE 
      WHEN v_total >= 20 AND (v_score::float / v_total) > 7 THEN 'validated'
      WHEN v_total >= 20 THEN 'under_review'
      ELSE status
    END,
    validated_at = CASE 
      WHEN v_total >= 20 AND validated_at IS NULL THEN CURRENT_TIMESTAMP
      ELSE validated_at
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.store_request_id;
  
  -- Update dynamic mission progress
  UPDATE dynamic_mission_queue
  SET 
    responses_received = v_total,
    active = CASE WHEN v_total >= target_responses_needed THEN FALSE ELSE active END,
    completed_at = CASE WHEN v_total >= target_responses_needed THEN CURRENT_TIMESTAMP ELSE completed_at END
  WHERE source_type = 'store_request' AND source_id = NEW.store_request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_store_score
AFTER INSERT ON store_request_validations
FOR EACH ROW
EXECUTE FUNCTION update_store_validation_score();

-- ===================================
-- VIEWS FOR ANALYTICS
-- ===================================

-- Top requested stores by city
CREATE OR REPLACE VIEW v_top_store_requests AS
SELECT 
  city,
  store_name,
  store_type,
  total_validations,
  validation_score,
  status,
  ROUND((validation_score::numeric / NULLIF(total_validations, 0)), 2) as avg_score,
  created_at
FROM user_store_requests
WHERE total_validations >= 5
ORDER BY validation_score DESC, total_validations DESC;

-- Most wanted features
CREATE OR REPLACE VIEW v_top_feature_requests AS
SELECT 
  feature_title,
  feature_category,
  total_votes,
  upvotes,
  downvotes,
  validation_score,
  status,
  business_priority,
  ROUND((upvotes::numeric / NULLIF(total_votes, 0)) * 100, 1) as approval_percentage,
  created_at
FROM user_feature_requests
WHERE total_votes >= 5
ORDER BY validation_score DESC;

-- Critical pain points
CREATE OR REPLACE VIEW v_critical_pain_points AS
SELECT 
  pain_point_title,
  affected_service,
  severity,
  frequency,
  total_confirmations,
  status,
  created_at
FROM user_pain_points
WHERE total_confirmations >= 3 AND status != 'resolved'
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  total_confirmations DESC;

-- Active validation missions
CREATE OR REPLACE VIEW v_active_validation_missions AS
SELECT 
  dmq.id,
  dmq.mission_type,
  dmq.mission_title,
  dmq.target_responses_needed,
  dmq.responses_received,
  ROUND((responses_received::numeric / target_responses_needed) * 100, 1) as completion_percentage,
  dmq.target_city,
  dmq.priority,
  dmq.created_at,
  dmq.expires_at,
  CASE dmq.source_type
    WHEN 'store_request' THEN usr.store_name
    WHEN 'feature_request' THEN ufr.feature_title
    WHEN 'pain_point' THEN upp.pain_point_title
  END as source_title
FROM dynamic_mission_queue dmq
LEFT JOIN user_store_requests usr ON dmq.source_type = 'store_request' AND dmq.source_id = usr.id
LEFT JOIN user_feature_requests ufr ON dmq.source_type = 'feature_request' AND dmq.source_id = ufr.id
LEFT JOIN user_pain_points upp ON dmq.source_type = 'pain_point' AND dmq.source_id = upp.id
WHERE dmq.active = TRUE
ORDER BY dmq.priority DESC, dmq.created_at DESC;

-- ===================================
-- SAMPLE REWARD CONFIG FOR VALIDATIONS
-- ===================================
INSERT INTO reward_config (config_name, config_type, wallet_amount, loyalty_points, description)
VALUES ('validation_reward', 'bonus', 2.00, 20, 'Quick validation/voting reward')
ON CONFLICT (config_name) DO NOTHING;

-- ===================================
-- COMMENTS
-- ===================================
COMMENT ON TABLE user_store_requests IS 'Stores/restaurants users want on Mangwale - crowdsourced demand';
COMMENT ON TABLE store_request_validations IS 'Other users validating demand for requested stores';
COMMENT ON TABLE dynamic_mission_queue IS 'Auto-generated missions from user submissions - viral loop';
COMMENT ON TABLE user_feature_requests IS 'Product features users want - prioritized by votes';
COMMENT ON TABLE user_pain_points IS 'Problems users face - validated by community';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Crowdsourced Market Research System Created!';
  RAISE NOTICE '🔄 Viral Loop: User A requests store → User B validates demand';
  RAISE NOTICE '📊 Tables: store_requests, validations, feature_requests, pain_points, dynamic_missions';
  RAISE NOTICE '🎯 Auto-creates validation missions via triggers';
  RAISE NOTICE '💡 Business gets: validated demand, feature prioritization, pain point tracking';
END $$;
