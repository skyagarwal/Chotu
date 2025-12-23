-- ===================================
-- FIX MISSING BASE TABLES
-- ===================================
-- Some tables were missing, create them now

-- Create user_context if not exists (referenced by many tables)
CREATE TABLE IF NOT EXISTS user_context (
  user_id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE,
  user_name VARCHAR(200),
  language_preference VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  game_type VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'medium',
  language VARCHAR(10) DEFAULT 'en',
  
  -- Mission Details
  mission_id VARCHAR(100),
  mission_data JSONB,
  
  -- Status & Results
  status VARCHAR(20) DEFAULT 'active',
  score INTEGER DEFAULT 0,
  completion_time_seconds INTEGER,
  
  -- Rewards
  rewards_earned JSONB,
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- Create training_samples table
CREATE TABLE IF NOT EXISTS training_samples (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100),
  user_id INTEGER,
  
  -- Training Data
  text TEXT NOT NULL,
  intent VARCHAR(100) NOT NULL,
  entities JSONB DEFAULT '{}',
  language VARCHAR(10) DEFAULT 'en',
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'manual',
  module_id INTEGER,
  confidence DECIMAL(5,4) DEFAULT 0,
  
  -- Review
  review_status VARCHAR(20) DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  reviewer_notes TEXT,
  
  -- Label Studio Integration
  label_studio_task_id INTEGER,
  label_studio_synced_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_training_samples_intent ON training_samples(intent);
CREATE INDEX IF NOT EXISTS idx_training_samples_review ON training_samples(review_status);

-- Create user_referrals table
CREATE TABLE IF NOT EXISTS user_referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL,
  referred_user_id INTEGER,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending',
  
  referrer_reward_wallet DECIMAL(10,2) DEFAULT 0,
  referrer_reward_points INTEGER DEFAULT 0,
  referee_reward_wallet DECIMAL(10,2) DEFAULT 0,
  referee_reward_points INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (referrer_id) REFERENCES user_context(user_id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES user_context(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_referrals_code ON user_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referrals_status ON user_referrals(status);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, achievement_type, achievement_name),
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(100) UNIQUE NOT NULL,
  team_name VARCHAR(200) NOT NULL,
  description TEXT,
  creator_id INTEGER NOT NULL,
  member_count INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (creator_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(100) NOT NULL,
  user_id INTEGER NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- Create leaderboard_entries table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0,
  total_missions_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(rank);

-- Create user_game_stats table
CREATE TABLE IF NOT EXISTS user_game_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  
  -- Totals
  total_missions_completed INTEGER DEFAULT 0,
  total_missions_failed INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_wallet_earned DECIMAL(10,2) DEFAULT 0,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_play_date DATE,
  
  -- Per Game Type
  intent_quest_completed INTEGER DEFAULT 0,
  language_master_completed INTEGER DEFAULT 0,
  tone_detective_completed INTEGER DEFAULT 0,
  entity_hunter_completed INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_user ON user_game_stats(user_id);

-- Create user_store_requests table
CREATE TABLE IF NOT EXISTS user_store_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  store_name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  area VARCHAR(200),
  
  reason TEXT,
  use_case TEXT,
  
  total_validations INTEGER DEFAULT 0,
  validation_score DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  validated_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_store_requests_status ON user_store_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_store_requests_city ON user_store_requests(city);

-- Create store_request_validations table
CREATE TABLE IF NOT EXISTS store_request_validations (
  id SERIAL PRIMARY KEY,
  store_request_id INTEGER NOT NULL,
  validator_user_id INTEGER NOT NULL,
  
  would_use BOOLEAN NOT NULL,
  frequency VARCHAR(50),
  willingness_to_pay DECIMAL(5,2),
  alternative_suggestion TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(store_request_id, validator_user_id),
  FOREIGN KEY (store_request_id) REFERENCES user_store_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (validator_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_validations_request ON store_request_validations(store_request_id);

-- Create user_feature_requests table
CREATE TABLE IF NOT EXISTS user_feature_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  feature_title VARCHAR(200) NOT NULL,
  feature_description TEXT NOT NULL,
  category VARCHAR(100),
  
  total_votes INTEGER DEFAULT 0,
  priority_score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON user_feature_requests(status);

-- Create feature_request_votes table
CREATE TABLE IF NOT EXISTS feature_request_votes (
  id SERIAL PRIMARY KEY,
  feature_request_id INTEGER NOT NULL,
  voter_user_id INTEGER NOT NULL,
  
  vote_value INTEGER CHECK (vote_value BETWEEN 1 AND 10),
  comment TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(feature_request_id, voter_user_id),
  FOREIGN KEY (feature_request_id) REFERENCES user_feature_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

-- Create user_pain_points table
CREATE TABLE IF NOT EXISTS user_pain_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  pain_point_title VARCHAR(200) NOT NULL,
  pain_point_description TEXT NOT NULL,
  category VARCHAR(100),
  
  total_confirmations INTEGER DEFAULT 0,
  severity_score DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

-- Create pain_point_confirmations table
CREATE TABLE IF NOT EXISTS pain_point_confirmations (
  id SERIAL PRIMARY KEY,
  pain_point_id INTEGER NOT NULL,
  confirmer_user_id INTEGER NOT NULL,
  
  experienced_same BOOLEAN NOT NULL,
  frequency VARCHAR(50),
  impact_level INTEGER CHECK (impact_level BETWEEN 1 AND 10),
  additional_context TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(pain_point_id, confirmer_user_id),
  FOREIGN KEY (pain_point_id) REFERENCES user_pain_points(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmer_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

-- Create user_learning_profiles table
CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  
  -- Skill Levels per Intent Category
  parcel_skill_level INTEGER DEFAULT 1,
  food_skill_level INTEGER DEFAULT 1,
  ecommerce_skill_level INTEGER DEFAULT 1,
  general_skill_level INTEGER DEFAULT 1,
  
  -- Language Proficiency
  english_proficiency VARCHAR(20) DEFAULT 'medium',
  hindi_proficiency VARCHAR(20) DEFAULT 'medium',
  marathi_proficiency VARCHAR(20) DEFAULT 'medium',
  hinglish_proficiency VARCHAR(20) DEFAULT 'medium',
  
  -- Learning Style
  preferred_difficulty VARCHAR(20) DEFAULT 'medium',
  learns_best_with VARCHAR(50),
  attention_span VARCHAR(20) DEFAULT 'medium',
  
  -- Engagement Patterns
  preferred_game_types TEXT[],
  peak_activity_hours INTEGER[],
  avg_session_length_minutes INTEGER,
  
  -- Adaptive Settings
  current_difficulty_multiplier DECIMAL(3,2) DEFAULT 1.0,
  auto_increase_difficulty BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_learning_user ON user_learning_profiles(user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All base tables created successfully!';
  RAISE NOTICE '📊 Tables: user_context, game_sessions, training_samples, user_referrals';
  RAISE NOTICE '🎮 Ready for full gamification system!';
END $$;
