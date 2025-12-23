-- ===================================
-- ENHANCED GAMIFICATION SYSTEM
-- ===================================
-- Flexible reward system supporting:
-- - Configurable wallet + loyalty points rewards
-- - Multi-language missions
-- - User preference collection
-- - Referral bonuses
-- - Team challenges
-- - Label Studio integration

-- ===================================
-- REWARD CONFIGURATION
-- ===================================
CREATE TABLE IF NOT EXISTS reward_config (
  id SERIAL PRIMARY KEY,
  
  -- Config Identity
  config_name VARCHAR(100) UNIQUE NOT NULL, -- e.g., "intent_quest_easy", "referral_bonus", "language_bonus"
  config_type VARCHAR(50) NOT NULL, -- game_reward, referral, achievement, bonus
  
  -- Reward Settings (NULL = not given)
  wallet_amount DECIMAL(10,2), -- Cash reward (₹)
  loyalty_points INTEGER, -- Loyalty points
  free_attempts INTEGER, -- Free game attempts
  
  -- Conditional Multipliers
  multiplier_config JSONB DEFAULT '{}', -- {"streak_3x": 1.5, "weekend_bonus": 2.0}
  
  -- Validity
  active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  
  -- Metadata
  description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample reward configurations
INSERT INTO reward_config (config_name, config_type, wallet_amount, loyalty_points, description) VALUES
('mission_easy', 'game_reward', 5.00, 50, 'Easy mission completion'),
('mission_medium', 'game_reward', 8.00, 80, 'Medium mission completion'),
('mission_hard', 'game_reward', 15.00, 150, 'Hard mission completion'),
('language_bonus', 'bonus', 3.00, 30, 'Completing mission in additional language'),
('referral_referrer', 'referral', 50.00, 500, 'Referrer bonus when friend joins'),
('referral_referee', 'referral', 25.00, 250, 'New user signup bonus via referral'),
('profile_completion', 'bonus', 10.00, 100, 'Completing user profile information'),
('daily_login', 'bonus', NULL, 10, 'Daily login bonus (points only)'),
('weekend_special', 'bonus', NULL, NULL, 'Weekend bonus - uses multipliers'),
('team_challenge_win', 'achievement', 100.00, 1000, 'Team challenge winner')
ON CONFLICT (config_name) DO NOTHING;

CREATE INDEX idx_reward_config_type ON reward_config(config_type, active);

-- ===================================
-- GAME SESSIONS (Enhanced)
-- ===================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  
  -- User & Game
  user_id INTEGER NOT NULL,
  game_type VARCHAR(50) NOT NULL, -- intent_quest, language_master, tone_detective, entity_hunter, profile_builder
  
  -- Mission Details
  mission JSONB NOT NULL, -- Full mission configuration
  mission_id VARCHAR(100),
  difficulty VARCHAR(20), -- easy, medium, hard
  target_intent VARCHAR(100),
  module_id INTEGER,
  
  -- Language Support
  language VARCHAR(10) DEFAULT 'en', -- en, hi, mr, hinglish
  is_language_bonus BOOLEAN DEFAULT FALSE, -- Repeated mission in different language
  original_session_id VARCHAR(100), -- Link to original mission if language bonus
  
  -- Progress
  status VARCHAR(20) DEFAULT 'active', -- active, completed, failed, abandoned
  score INTEGER DEFAULT 0, -- 0-100
  response_text TEXT,
  response_metadata JSONB,
  
  -- Rewards (flexible configuration)
  reward_config_id INTEGER REFERENCES reward_config(id),
  wallet_reward DECIMAL(10,2) DEFAULT 0,
  loyalty_points_reward INTEGER DEFAULT 0,
  actual_multiplier DECIMAL(5,2) DEFAULT 1.0, -- Applied multiplier (streak, event, etc.)
  
  -- User Preference Data Collected
  preferences_extracted JSONB, -- {"dietary": "veg", "tone": "friendly", "price_sensitive": false}
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Label Studio Integration
  sent_to_labelstudio BOOLEAN DEFAULT FALSE,
  labelstudio_task_id INTEGER,
  reviewed_by_human BOOLEAN DEFAULT FALSE,
  review_score INTEGER, -- Human reviewer score 0-100
  review_feedback TEXT,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id, created_at);
CREATE INDEX idx_game_sessions_status ON game_sessions(status, completed_at);
CREATE INDEX idx_game_sessions_language ON game_sessions(language, is_language_bonus);
CREATE INDEX idx_game_sessions_labelstudio ON game_sessions(sent_to_labelstudio, reviewed_by_human);

-- ===================================
-- TRAINING SAMPLES (Enhanced for games)
-- ===================================
CREATE TABLE IF NOT EXISTS training_samples (
  id SERIAL PRIMARY KEY,
  
  -- Source
  game_session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  
  -- Training Data
  text TEXT NOT NULL,
  intent VARCHAR(100) NOT NULL,
  module_id INTEGER NOT NULL,
  entities JSONB DEFAULT '[]',
  
  -- Language & Quality
  language VARCHAR(10) DEFAULT 'en',
  tone VARCHAR(20),
  sentiment VARCHAR(20),
  confidence DECIMAL(5,4) DEFAULT 0.5,
  
  -- Review Status
  review_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, needs_review
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'game', -- game, conversation, manual
  game_type VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_training_samples_review ON training_samples(review_status, language, intent);
CREATE INDEX idx_training_samples_game_session ON training_samples(game_session_id);

-- ===================================
-- USER REFERRALS
-- ===================================
CREATE TABLE IF NOT EXISTS user_referrals (
  id SERIAL PRIMARY KEY,
  
  -- Referrer (person who invited)
  referrer_user_id INTEGER NOT NULL,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Referee (person who joined)
  referee_user_id INTEGER,
  referee_phone VARCHAR(20),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, expired
  completed_at TIMESTAMP,
  
  -- Rewards Given
  referrer_reward_config_id INTEGER REFERENCES reward_config(id),
  referrer_wallet_reward DECIMAL(10,2),
  referrer_loyalty_points INTEGER,
  
  referee_reward_config_id INTEGER REFERENCES reward_config(id),
  referee_wallet_reward DECIMAL(10,2),
  referee_loyalty_points INTEGER,
  
  -- Metadata
  campaign_name VARCHAR(100), -- Track different referral campaigns
  utm_source VARCHAR(50),
  utm_medium VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (referrer_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE,
  FOREIGN KEY (referee_user_id) REFERENCES user_context(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_referrals_referrer ON user_referrals(referrer_user_id, status);
CREATE INDEX idx_referrals_code ON user_referrals(referral_code);
CREATE INDEX idx_referrals_referee ON user_referrals(referee_user_id);

-- ===================================
-- USER ACHIEVEMENTS
-- ===================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL,
  
  -- Achievement
  achievement_type VARCHAR(50) NOT NULL, -- intent_master, polyglot, streak_warrior, data_contributor
  achievement_name VARCHAR(100) NOT NULL,
  achievement_tier VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum
  
  -- Criteria Met
  criteria_config JSONB, -- {"missions_completed": 100, "languages_used": 3}
  progress_percentage INTEGER DEFAULT 0, -- 0-100
  
  -- Rewards
  reward_config_id INTEGER REFERENCES reward_config(id),
  wallet_reward DECIMAL(10,2),
  loyalty_points_reward INTEGER,
  
  -- Badge/Visual
  badge_icon VARCHAR(100), -- Emoji or icon identifier
  badge_color VARCHAR(20),
  
  -- Status
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id, unlocked);
CREATE INDEX idx_achievements_type ON user_achievements(achievement_type);

-- ===================================
-- TEAM CHALLENGES
-- ===================================
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  
  team_name VARCHAR(100) UNIQUE NOT NULL,
  team_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Team Info
  captain_user_id INTEGER NOT NULL,
  max_members INTEGER DEFAULT 5,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Stats
  total_score INTEGER DEFAULT 0,
  total_missions_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (captain_user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  
  team_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- Role
  role VARCHAR(20) DEFAULT 'member', -- captain, member
  
  -- Contribution
  missions_contributed INTEGER DEFAULT 0,
  score_contributed INTEGER DEFAULT 0,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);

-- ===================================
-- LEADERBOARDS
-- ===================================
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  
  -- Period
  period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, all_time
  period_start DATE NOT NULL,
  period_end DATE,
  
  -- User/Team
  user_id INTEGER,
  team_id INTEGER,
  
  -- Ranking
  rank INTEGER,
  score INTEGER DEFAULT 0,
  
  -- Stats
  missions_completed INTEGER DEFAULT 0,
  wallet_earned DECIMAL(10,2) DEFAULT 0,
  loyalty_points_earned INTEGER DEFAULT 0,
  
  -- Rewards (for top rankers)
  prize_config_id INTEGER REFERENCES reward_config(id),
  prize_awarded BOOLEAN DEFAULT FALSE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(period_type, period_start, user_id),
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX idx_leaderboard_period ON leaderboard_entries(period_type, period_start, rank);
CREATE INDEX idx_leaderboard_user ON leaderboard_entries(user_id);

-- ===================================
-- USER GAME STATS (Aggregated)
-- ===================================
CREATE TABLE IF NOT EXISTS user_game_stats (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER UNIQUE NOT NULL,
  
  -- Overall Stats
  total_games_played INTEGER DEFAULT 0,
  total_games_completed INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  
  -- Rewards Earned
  total_wallet_earned DECIMAL(10,2) DEFAULT 0,
  total_loyalty_points_earned INTEGER DEFAULT 0,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0, -- Days in a row
  longest_streak INTEGER DEFAULT 0,
  last_played_date DATE,
  
  -- Language Diversity
  languages_played JSONB DEFAULT '{}', -- {"en": 50, "hi": 30, "mr": 10, "hinglish": 20}
  
  -- Intent Coverage
  intents_covered JSONB DEFAULT '{}', -- {"order_food": 10, "book_parcel": 5}
  
  -- Profile Contribution
  profile_fields_filled INTEGER DEFAULT 0,
  profile_completeness DECIMAL(5,2) DEFAULT 0, -- Percentage
  
  -- Social
  referrals_made INTEGER DEFAULT 0,
  team_id INTEGER REFERENCES teams(id),
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user_context(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_game_stats_user ON user_game_stats(user_id);

-- ===================================
-- MISSION TEMPLATES (Configurable)
-- ===================================
CREATE TABLE IF NOT EXISTS mission_templates (
  id SERIAL PRIMARY KEY,
  
  -- Mission Identity
  mission_id VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- Game Type
  game_type VARCHAR(50) NOT NULL, -- intent_quest, profile_builder, language_master
  
  -- Classification
  target_intent VARCHAR(100),
  module_id INTEGER,
  difficulty VARCHAR(20) NOT NULL, -- easy, medium, hard
  
  -- Requirements
  expected_entities JSONB DEFAULT '[]', -- ["food_item", "quantity", "location"]
  hints JSONB DEFAULT '[]', -- ["Mention what food", "How many"]
  
  -- Rewards (references reward_config)
  reward_config_id INTEGER REFERENCES reward_config(id),
  
  -- Language Support
  supported_languages TEXT[] DEFAULT ARRAY['en'], -- ['en', 'hi', 'mr', 'hinglish']
  language_bonus_enabled BOOLEAN DEFAULT TRUE,
  
  -- User Preference Collection
  collects_preference_types TEXT[], -- ["dietary", "tone", "price_sensitivity"]
  preference_extraction_config JSONB, -- LLM prompt or rules for extraction
  
  -- Dynamic Generation
  is_dynamic BOOLEAN DEFAULT FALSE, -- If TRUE, LLM generates variations
  llm_generation_prompt TEXT, -- Prompt for LLM to create mission
  
  -- Availability
  active BOOLEAN DEFAULT TRUE,
  requires_level INTEGER DEFAULT 1, -- User must be at this level
  max_completions_per_user INTEGER, -- NULL = unlimited
  
  -- Metadata
  created_by VARCHAR(100),
  tags TEXT[], -- ["nashik", "food", "urgent_delivery"]
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mission_templates_game_type ON mission_templates(game_type, active);
CREATE INDEX idx_mission_templates_difficulty ON mission_templates(difficulty);
CREATE INDEX idx_mission_templates_intent ON mission_templates(target_intent);

-- ===================================
-- VIEWS FOR ANALYTICS
-- ===================================

-- User performance summary
CREATE OR REPLACE VIEW v_user_game_performance AS
SELECT 
  u.user_id,
  u.phone,
  ugs.total_games_played,
  ugs.total_games_completed,
  ugs.avg_score,
  ugs.total_wallet_earned,
  ugs.total_loyalty_points_earned,
  ugs.current_streak,
  ugs.profile_completeness,
  COALESCE(t.team_name, 'No Team') as team_name,
  COALESCE(lb.rank, 9999) as current_rank
FROM user_context u
LEFT JOIN user_game_stats ugs ON u.user_id = ugs.user_id
LEFT JOIN teams t ON ugs.team_id = t.id
LEFT JOIN leaderboard_entries lb ON u.user_id = lb.user_id 
  AND lb.period_type = 'all_time'
ORDER BY ugs.total_score DESC;

-- Training data quality
CREATE OR REPLACE VIEW v_training_data_quality AS
SELECT 
  language,
  intent,
  review_status,
  COUNT(*) as sample_count,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT user_id) as unique_users
FROM training_samples
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY language, intent, review_status
ORDER BY sample_count DESC;

-- Daily gamification stats
CREATE OR REPLACE VIEW v_daily_gamification_stats AS
SELECT 
  DATE(started_at) as date,
  COUNT(*) as total_games,
  COUNT(DISTINCT user_id) as unique_players,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_games,
  AVG(score) as avg_score,
  SUM(wallet_reward) as total_wallet_distributed,
  SUM(loyalty_points_reward) as total_points_distributed,
  COUNT(DISTINCT CASE WHEN is_language_bonus THEN user_id END) as multi_language_users
FROM game_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- ===================================
-- FUNCTIONS
-- ===================================

-- Function to update user game stats after session completion
CREATE OR REPLACE FUNCTION update_user_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO user_game_stats (user_id, total_games_played, total_games_completed, total_score, total_wallet_earned, total_loyalty_points_earned, last_played_date)
    VALUES (NEW.user_id, 1, 1, NEW.score, NEW.wallet_reward, NEW.loyalty_points_reward, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
      total_games_played = user_game_stats.total_games_played + 1,
      total_games_completed = user_game_stats.total_games_completed + 1,
      total_score = user_game_stats.total_score + NEW.score,
      avg_score = (user_game_stats.total_score + NEW.score) / (user_game_stats.total_games_completed + 1),
      total_wallet_earned = user_game_stats.total_wallet_earned + NEW.wallet_reward,
      total_loyalty_points_earned = user_game_stats.total_loyalty_points_earned + NEW.loyalty_points_reward,
      last_played_date = CURRENT_DATE,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_game_stats
AFTER UPDATE ON game_sessions
FOR EACH ROW
EXECUTE FUNCTION update_user_game_stats();

-- Function to calculate streaks
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_date DATE;
BEGIN
  -- Get dates user played (ordered descending)
  FOR v_date IN 
    SELECT DISTINCT DATE(started_at) 
    FROM game_sessions 
    WHERE user_id = p_user_id AND status = 'completed'
    ORDER BY DATE(started_at) DESC
  LOOP
    IF v_streak = 0 THEN
      -- First day
      v_streak := 1;
    ELSIF v_date = CURRENT_DATE - (v_streak || ' days')::INTERVAL THEN
      -- Consecutive day
      v_streak := v_streak + 1;
    ELSE
      -- Streak broken
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- COMMENTS
-- ===================================
COMMENT ON TABLE reward_config IS 'Flexible reward configuration - supports wallet, points, or both';
COMMENT ON TABLE game_sessions IS 'Enhanced game sessions with language support, preference collection, and Label Studio integration';
COMMENT ON TABLE training_samples IS 'Training data collected from games for NLU model training';
COMMENT ON TABLE user_referrals IS 'Referral system tracking with configurable rewards';
COMMENT ON TABLE mission_templates IS 'Configurable mission templates supporting dynamic LLM generation';
COMMENT ON TABLE user_game_stats IS 'Aggregated user statistics for leaderboards and analytics';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Gamification Schema Created Successfully!';
  RAISE NOTICE '📊 Tables: reward_config, game_sessions, training_samples, user_referrals, achievements, teams, leaderboards';
  RAISE NOTICE '🎮 Features: Flexible rewards, multi-language, user profiling, referrals, Label Studio integration';
  RAISE NOTICE '🔧 Configuration: All rewards configurable via reward_config table';
END $$;
