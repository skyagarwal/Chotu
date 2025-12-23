-- Migration: Add complete training workflow tables
-- Purpose: Enable conversation logging → human review → model training cycle
-- Date: 2025-11-13

-- ===================================
-- CONVERSATION LOGGING (Captures everything in real-time)
-- ===================================

CREATE TABLE IF NOT EXISTS conversation_logs (
  id SERIAL PRIMARY KEY,
  
  -- Session tracking
  session_id VARCHAR(255),
  phone_number VARCHAR(20),
  user_id INT, -- Links to PHP backend users.id
  
  -- User input
  user_message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'voice', 'button', 'location'
  message_language VARCHAR(10), -- Detected language
  
  -- NLU output (what model predicted)
  nlu_intent VARCHAR(100),
  nlu_confidence DECIMAL(5,4), -- 0.0000 to 1.0000
  nlu_module_id INT, -- 3=parcel, 4=food, 5=ecommerce
  nlu_module_type VARCHAR(50), -- 'parcel', 'food', 'ecommerce'
  nlu_provider VARCHAR(50), -- 'indicbert', 'llm-fallback', 'heuristic'
  nlu_entities JSONB, -- Extracted entities (query, locality, veg, etc.)
  nlu_tone VARCHAR(50), -- 'polite', 'urgent', 'neutral'
  nlu_processing_time_ms INT,
  
  -- Routing decision
  routed_to VARCHAR(50), -- 'opensearch', 'php', 'hybrid'
  routing_reason TEXT, -- Why this routing decision
  
  -- System response
  response_text TEXT,
  response_type VARCHAR(50), -- 'search', 'transaction', 'error', 'clarification'
  response_time_ms INT,
  response_success BOOLEAN,
  
  -- User feedback (critical for training!)
  user_feedback VARCHAR(50), -- 'positive', 'negative', 'correction', 'no-response'
  user_correction TEXT, -- If user corrected the intent
  user_clicked_result INT, -- Which search result was clicked
  user_completed_action BOOLEAN DEFAULT FALSE, -- Did user complete order/booking?
  
  -- Context
  conversation_context JSONB, -- Full conversation state at this point
  previous_intent VARCHAR(100), -- What was the previous intent in session
  
  -- Training data flags (auto-set by filters)
  is_training_candidate BOOLEAN DEFAULT FALSE,
  training_confidence_bucket VARCHAR(20), -- 'high', 'medium', 'low', 'error'
  review_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'auto-approved', 'needs-review', 'approved', 'rejected'
  review_priority INT DEFAULT 5, -- 1=highest, 10=lowest (for human review queue)
  
  -- Metadata
  platform VARCHAR(20) DEFAULT 'whatsapp',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- Indexes for conversation_logs
CREATE INDEX idx_conv_session ON conversation_logs(session_id);
CREATE INDEX idx_conv_phone ON conversation_logs(phone_number);
CREATE INDEX idx_conv_user_id ON conversation_logs(user_id);
CREATE INDEX idx_conv_created_at ON conversation_logs(created_at);
CREATE INDEX idx_conv_training_candidate ON conversation_logs(is_training_candidate, review_status);
CREATE INDEX idx_conv_review_queue ON conversation_logs(review_status, review_priority, created_at);
CREATE INDEX idx_conv_nlu_provider ON conversation_logs(nlu_provider, created_at);
CREATE INDEX idx_conv_confidence ON conversation_logs(nlu_confidence);

COMMENT ON TABLE conversation_logs IS 'Captures every user conversation for analytics, debugging, and training data collection';
COMMENT ON COLUMN conversation_logs.nlu_confidence IS 'Model confidence (0.85+ = high, 0.70-0.85 = medium, <0.70 = low)';
COMMENT ON COLUMN conversation_logs.review_status IS 'Auto-approved (>0.85) go directly to training, needs-review (<0.85) go to Label Studio';

-- ===================================
-- TRAINING SAMPLES (Approved data for model training)
-- ===================================

CREATE TABLE IF NOT EXISTS training_samples (
  id SERIAL PRIMARY KEY,
  
  -- Link to original conversation (optional - can be synthetic)
  conversation_log_id INT REFERENCES conversation_logs(id) ON DELETE SET NULL,
  
  -- Training data (cleaned and verified)
  text TEXT NOT NULL,
  intent VARCHAR(100) NOT NULL,
  module_id INT NOT NULL, -- 3, 4, or 5
  module_type VARCHAR(50) NOT NULL, -- 'parcel', 'food', 'ecommerce'
  entities JSONB,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  
  -- Routing metadata (what system should do)
  expected_service VARCHAR(50), -- 'opensearch', 'php'
  expected_endpoint VARCHAR(200), -- Specific API endpoint
  
  -- Review information
  review_status VARCHAR(50) DEFAULT 'pending',
  reviewed_by VARCHAR(255), -- Email of human reviewer
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  review_changes JSONB, -- What human corrected (if anything)
  
  -- Model versioning (which model was trained with this sample)
  model_version_target VARCHAR(50), -- 'router-v1.0.0', 'router-v1.1.0', etc.
  training_date TIMESTAMP, -- When this sample was used for training
  
  -- Quality metadata
  source VARCHAR(50) DEFAULT 'production', -- 'production', 'synthetic', 'manual', 'augmented'
  confidence_bucket VARCHAR(20), -- Original confidence when captured
  quality_score DECIMAL(3,2), -- 0.00-1.00 (human-assigned quality)
  
  -- Label Studio integration
  labelstudio_task_id INT,
  labelstudio_annotation_id INT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for training_samples
CREATE INDEX idx_ts_review_status ON training_samples(review_status);
CREATE INDEX idx_ts_model_version ON training_samples(model_version_target);
CREATE INDEX idx_ts_intent ON training_samples(intent);
CREATE INDEX idx_ts_module ON training_samples(module_id, module_type);
CREATE INDEX idx_ts_language ON training_samples(language);
CREATE INDEX idx_ts_source ON training_samples(source);
CREATE INDEX idx_ts_training_queue ON training_samples(review_status, model_version_target);

COMMENT ON TABLE training_samples IS 'Human-reviewed and approved samples ready for model training';
COMMENT ON COLUMN training_samples.review_status IS 'pending → approved → used for training';
COMMENT ON COLUMN training_samples.model_version_target IS 'NULL = not yet used for training, v1.X.0 = already trained';

-- ===================================
-- MODEL VERSIONS (Track all trained models)
-- ===================================

CREATE TABLE IF NOT EXISTS model_versions (
  id SERIAL PRIMARY KEY,
  
  -- Version identification
  version VARCHAR(50) UNIQUE NOT NULL, -- 'router-v1.0.0', 'food-agent-v1.0.0'
  model_type VARCHAR(50) NOT NULL, -- 'router', 'food-agent', 'parcel-agent', 'ecommerce-agent'
  parent_version VARCHAR(50), -- Which version this was trained from (for incremental learning)
  
  -- Storage (MinIO paths)
  minio_bucket VARCHAR(100) DEFAULT 'models',
  minio_path VARCHAR(255), -- 'router/v1.0.0/model.bin'
  model_size_mb DECIMAL(10,2),
  config_path VARCHAR(255), -- Path to config.json
  tokenizer_path VARCHAR(255), -- Path to tokenizer files
  
  -- Training information
  base_model VARCHAR(100), -- 'ai4bharat/indic-bert', 'xlm-roberta-base'
  training_samples INT, -- Total samples used
  training_date TIMESTAMP,
  training_duration_minutes INT,
  training_config JSONB, -- Hyperparameters used
  
  -- Performance metrics
  training_accuracy DECIMAL(5,4),
  validation_accuracy DECIMAL(5,4),
  test_accuracy DECIMAL(5,4),
  intent_accuracy DECIMAL(5,4), -- Specific to intent classification
  module_accuracy DECIMAL(5,4), -- Specific to module classification
  entity_f1_score DECIMAL(5,4), -- For entity extraction
  
  -- Test set breakdown
  test_samples INT,
  test_metrics JSONB, -- Detailed per-intent, per-module metrics
  
  -- Deployment status
  status VARCHAR(50) DEFAULT 'training', -- 'training', 'testing', 'canary', 'production', 'archived', 'failed'
  deployed_at TIMESTAMP,
  deployment_config JSONB, -- Deployment-specific settings
  
  -- A/B testing
  traffic_percentage INT DEFAULT 0, -- 0-100 (for gradual rollout)
  ab_test_started_at TIMESTAMP,
  ab_test_metrics JSONB, -- Real-world performance during A/B test
  
  -- Production performance (live monitoring)
  production_accuracy DECIMAL(5,4), -- Measured from user feedback
  total_predictions INT DEFAULT 0,
  successful_predictions INT DEFAULT 0,
  fallback_rate DECIMAL(5,4), -- How often it falls back to LLM
  avg_confidence DECIMAL(5,4),
  avg_latency_ms INT,
  
  -- Improvements & changes
  improvements TEXT[], -- List of improvements over previous version
  breaking_changes TEXT[], -- List of breaking changes
  changelog TEXT,
  
  -- Quality gates (did it pass all checks?)
  quality_gate_passed BOOLEAN DEFAULT FALSE,
  quality_checks JSONB, -- Results of various quality checks
  
  -- Metadata
  created_by VARCHAR(100), -- Who triggered the training
  notes TEXT,
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

-- Indexes for model_versions
CREATE INDEX idx_mv_version ON model_versions(version);
CREATE INDEX idx_mv_model_type ON model_versions(model_type);
CREATE INDEX idx_mv_status ON model_versions(status);
CREATE INDEX idx_mv_traffic ON model_versions(traffic_percentage);
CREATE INDEX idx_mv_deployed ON model_versions(deployed_at);

COMMENT ON TABLE model_versions IS 'Tracks all trained model versions with metrics and deployment status';
COMMENT ON COLUMN model_versions.status IS 'training → testing → canary (10%) → production (100%)';
COMMENT ON COLUMN model_versions.traffic_percentage IS 'For A/B testing: 0% (not deployed) to 100% (full production)';

-- ===================================
-- MODEL DEPLOYMENT HISTORY (Audit trail)
-- ===================================

CREATE TABLE IF NOT EXISTS model_deployments (
  id SERIAL PRIMARY KEY,
  
  -- Which model version
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  
  -- Deployment action
  action VARCHAR(50) NOT NULL, -- 'deploy', 'rollback', 'scale-up', 'scale-down', 'archive'
  from_traffic_percentage INT, -- Previous traffic %
  to_traffic_percentage INT, -- New traffic %
  
  -- Reason & context
  reason TEXT,
  triggered_by VARCHAR(100), -- Who/what triggered this
  trigger_type VARCHAR(50), -- 'manual', 'auto-rollback', 'scheduled', 'performance-degradation'
  
  -- Metrics at time of deployment
  metrics_snapshot JSONB,
  
  -- Result
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Timestamps
  deployed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for model_deployments
CREATE INDEX idx_md_model_version ON model_deployments(model_version);
CREATE INDEX idx_md_deployed_at ON model_deployments(deployed_at);

COMMENT ON TABLE model_deployments IS 'Audit trail of all model deployments, rollbacks, and traffic changes';

-- ===================================
-- TRAINING DATA EXPORT QUEUE (For batch processing)
-- ===================================

CREATE TABLE IF NOT EXISTS training_export_jobs (
  id SERIAL PRIMARY KEY,
  
  -- Export configuration
  target_model_version VARCHAR(50), -- Which version we're preparing to train
  model_type VARCHAR(50) NOT NULL,
  
  -- Data selection criteria
  min_samples INT NOT NULL,
  max_samples INT,
  languages VARCHAR(10)[], -- Which languages to include
  date_from TIMESTAMP,
  date_to TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'exporting', 'completed', 'failed'
  progress INT DEFAULT 0, -- 0-100
  
  -- Results
  total_samples_exported INT DEFAULT 0,
  export_file_path VARCHAR(500), -- Where the JSONL file is saved
  export_file_size_mb DECIMAL(10,2),
  
  -- Processing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  
  -- Triggered by
  triggered_by VARCHAR(100),
  trigger_type VARCHAR(50), -- 'manual', 'scheduled', 'auto-threshold'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for training_export_jobs
CREATE INDEX idx_tej_status ON training_export_jobs(status);
CREATE INDEX idx_tej_target_version ON training_export_jobs(target_model_version);

COMMENT ON TABLE training_export_jobs IS 'Manages batch export of training samples to JSONL files for model training';

-- ===================================
-- LABEL STUDIO INTEGRATION (Sync state)
-- ===================================

CREATE TABLE IF NOT EXISTS labelstudio_projects (
  id SERIAL PRIMARY KEY,
  
  -- Label Studio project details
  project_id INT UNIQUE NOT NULL, -- Label Studio project ID
  project_name VARCHAR(200) NOT NULL,
  project_url VARCHAR(500),
  
  -- Project configuration
  model_type VARCHAR(50), -- 'router', 'food-agent', etc.
  labeling_config XML, -- Label Studio XML config
  
  -- Sync status
  last_sync_at TIMESTAMP,
  total_tasks INT DEFAULT 0,
  completed_tasks INT DEFAULT 0,
  pending_tasks INT DEFAULT 0,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for labelstudio_projects
CREATE INDEX idx_ls_project_id ON labelstudio_projects(project_id);
CREATE INDEX idx_ls_active ON labelstudio_projects(active);

COMMENT ON TABLE labelstudio_projects IS 'Tracks Label Studio projects for human annotation';

-- ===================================
-- HELPER VIEWS (For easy querying)
-- ===================================

-- View: Training queue (samples waiting for review)
CREATE OR REPLACE VIEW training_queue AS
SELECT 
  id,
  user_message AS text,
  nlu_intent AS suggested_intent,
  nlu_confidence AS confidence,
  nlu_module_id,
  nlu_provider AS source,
  review_status,
  review_priority,
  created_at
FROM conversation_logs
WHERE is_training_candidate = TRUE
  AND review_status IN ('pending', 'needs-review')
ORDER BY review_priority ASC, created_at DESC;

COMMENT ON VIEW training_queue IS 'Samples waiting for human review in Label Studio';

-- View: Model performance comparison
CREATE OR REPLACE VIEW model_performance_comparison AS
SELECT 
  version,
  model_type,
  status,
  test_accuracy,
  production_accuracy,
  traffic_percentage,
  fallback_rate,
  avg_latency_ms,
  deployed_at,
  training_samples
FROM model_versions
WHERE status IN ('canary', 'production', 'testing')
ORDER BY model_type, traffic_percentage DESC;

COMMENT ON VIEW model_performance_comparison IS 'Compare performance of different model versions';

-- View: Daily training data statistics
CREATE OR REPLACE VIEW daily_training_stats AS
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_conversations,
  COUNT(*) FILTER (WHERE is_training_candidate = TRUE) AS training_candidates,
  COUNT(*) FILTER (WHERE review_status = 'auto-approved') AS auto_approved,
  COUNT(*) FILTER (WHERE review_status = 'needs-review') AS needs_review,
  AVG(nlu_confidence) AS avg_confidence,
  COUNT(*) FILTER (WHERE nlu_provider = 'indicbert') AS indicbert_count,
  COUNT(*) FILTER (WHERE nlu_provider = 'llm-fallback') AS llm_fallback_count
FROM conversation_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW daily_training_stats IS 'Daily statistics for training data collection';

-- ===================================
-- TRIGGERS (Auto-update timestamps)
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_samples_updated_at
  BEFORE UPDATE ON training_samples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER model_versions_updated_at
  BEFORE UPDATE ON model_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ===================================
-- INITIAL DATA (Bootstrap)
-- ===================================

-- Insert initial model version (v1.0.0 - the one we're about to train)
INSERT INTO model_versions (
  version, 
  model_type, 
  base_model, 
  status, 
  training_samples,
  notes
) VALUES (
  'router-v1.0.0',
  'router',
  'ai4bharat/indic-bert',
  'training',
  1500,
  'Initial production router model trained on synthetic samples'
) ON CONFLICT (version) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Training workflow tables created successfully!';
  RAISE NOTICE '📊 Tables: conversation_logs, training_samples, model_versions, model_deployments';
  RAISE NOTICE '📈 Views: training_queue, model_performance_comparison, daily_training_stats';
  RAISE NOTICE '🎯 Ready for: conversation logging → human review → model training';
END $$;
