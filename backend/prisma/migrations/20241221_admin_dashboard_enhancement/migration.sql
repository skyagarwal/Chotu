-- Admin Dashboard Schema Enhancement
-- Migration for roles, self-learning analytics, and data sources management

-- Admin Users with Roles
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin', 'manager', 'reviewer', 'viewer'))
);

-- Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id SERIAL PRIMARY KEY,
    admin_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id)
);

-- NLU Training Data (enhanced from previous migration)
CREATE TABLE IF NOT EXISTS nlu_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    intent VARCHAR(100) NOT NULL,
    entities JSONB DEFAULT '[]'::jsonb,
    confidence DECIMAL(4, 3),
    status VARCHAR(30) DEFAULT 'pending_review',
    priority VARCHAR(10) DEFAULT 'normal',
    conversation_id VARCHAR(100),
    user_id VARCHAR(100),
    auto_approved_at TIMESTAMP,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    rejected_by VARCHAR(100),
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    label_studio_task_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('auto_approved', 'pending_review', 'approved', 'rejected', 'sent_to_label_studio'))
);

-- Auto Approval Statistics
CREATE TABLE IF NOT EXISTS auto_approval_stats (
    intent VARCHAR(100) PRIMARY KEY,
    count INTEGER DEFAULT 0,
    avg_confidence DECIMAL(4, 3),
    last_approved_at TIMESTAMP
);

-- Model Training History
CREATE TABLE IF NOT EXISTS model_training_history (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    training_examples_count INTEGER,
    intents_count INTEGER,
    entities_count INTEGER,
    accuracy DECIMAL(4, 3),
    precision_score DECIMAL(4, 3),
    recall DECIMAL(4, 3),
    f1_score DECIMAL(4, 3),
    training_duration_seconds INTEGER,
    trained_by VARCHAR(100),
    trained_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

-- Self-Learning Analytics View
CREATE OR REPLACE VIEW v_learning_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_examples,
    COUNT(*) FILTER (WHERE status = 'auto_approved') as auto_approved,
    COUNT(*) FILTER (WHERE status = 'approved') as human_approved,
    COUNT(*) FILTER (WHERE status = 'pending_review') as pending,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
    AVG(confidence) as avg_confidence,
    COUNT(DISTINCT intent) as unique_intents
FROM nlu_training_data
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Learning Progress View (daily)
CREATE OR REPLACE VIEW v_learning_progress AS
SELECT 
    DATE_TRUNC('day', created_at) as day,
    SUM(CASE WHEN status IN ('auto_approved', 'approved') THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_count,
    AVG(confidence) FILTER (WHERE status = 'auto_approved') as auto_approve_avg_confidence
FROM nlu_training_data
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day;

-- Intent Distribution View
CREATE OR REPLACE VIEW v_intent_distribution AS
SELECT 
    intent,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status IN ('auto_approved', 'approved')) as approved,
    AVG(confidence) as avg_confidence,
    MAX(created_at) as last_seen
FROM nlu_training_data
GROUP BY intent
ORDER BY total DESC;

-- Data Sources Management (enhanced)
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS avg_response_time_ms INTEGER;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMP;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS last_error_message TEXT;

-- Data Source Usage Log
CREATE TABLE IF NOT EXISTS data_source_usage_log (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL,
    source_name VARCHAR(100),
    data_type VARCHAR(50),
    success BOOLEAN,
    response_time_ms INTEGER,
    error_message TEXT,
    request_data JSONB,
    response_summary JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Data Source Health View
CREATE OR REPLACE VIEW v_data_source_health AS
SELECT 
    ds.id,
    ds.name,
    ds.data_type,
    ds.is_active,
    ds.priority,
    ds.usage_count,
    ds.avg_response_time_ms,
    ds.error_count,
    ds.last_success_at,
    ds.last_error_at,
    CASE 
        WHEN ds.error_count > 10 AND ds.last_error_at > ds.last_success_at THEN 'critical'
        WHEN ds.error_count > 5 THEN 'degraded'
        WHEN ds.last_error_at > NOW() - INTERVAL '1 hour' THEN 'warning'
        ELSE 'healthy'
    END as health_status
FROM data_sources ds
WHERE ds.is_active = true
ORDER BY ds.priority;

-- Scraper Job Status View (for admin dashboard)
CREATE OR REPLACE VIEW v_scraper_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) FILTER (WHERE status = 'completed') as avg_duration_seconds
FROM scrape_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Store Competitor Mapping Status View
CREATE OR REPLACE VIEW v_mapping_status AS
SELECT 
    COUNT(DISTINCT s.id) as total_stores,
    COUNT(DISTINCT scm.store_id) FILTER (WHERE scm.source = 'zomato') as mapped_zomato,
    COUNT(DISTINCT scm.store_id) FILTER (WHERE scm.source = 'swiggy') as mapped_swiggy,
    COUNT(DISTINCT scm.store_id) FILTER (WHERE scm.source = 'zomato' AND scm.source = 'swiggy') as mapped_both,
    AVG(scm.match_confidence) as avg_confidence,
    COUNT(*) FILTER (WHERE scm.verified_by_admin = true) as verified_count
FROM stores s
LEFT JOIN store_competitor_mapping scm ON s.id = scm.store_id;

-- Dashboard Overview Function
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
    total_training_examples BIGINT,
    pending_reviews BIGINT,
    auto_approved_rate DECIMAL,
    model_accuracy DECIMAL,
    active_data_sources BIGINT,
    scraper_jobs_today BIGINT,
    stores_mapped BIGINT,
    last_training_date TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM nlu_training_data)::BIGINT,
        (SELECT COUNT(*) FROM nlu_training_data WHERE status = 'pending_review')::BIGINT,
        (SELECT COUNT(*) FILTER (WHERE status = 'auto_approved')::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0) * 100 FROM nlu_training_data),
        (SELECT accuracy FROM model_training_history ORDER BY trained_at DESC LIMIT 1),
        (SELECT COUNT(*) FROM data_sources WHERE is_active = true)::BIGINT,
        (SELECT COUNT(*) FROM scrape_jobs WHERE DATE(created_at) = CURRENT_DATE)::BIGINT,
        (SELECT COUNT(DISTINCT store_id) FROM store_competitor_mapping)::BIGINT,
        (SELECT MAX(trained_at) FROM model_training_history);
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_data_status ON nlu_training_data(status);
CREATE INDEX IF NOT EXISTS idx_training_data_intent ON nlu_training_data(intent);
CREATE INDEX IF NOT EXISTS idx_training_data_created ON nlu_training_data(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_data_source_usage_source ON data_source_usage_log(source_id);
CREATE INDEX IF NOT EXISTS idx_data_source_usage_created ON data_source_usage_log(created_at);

-- Insert default super admin (password: MangwaleAdmin2024!)
-- IMPORTANT: Change this password immediately in production
INSERT INTO admin_users (email, password_hash, name, role, is_active, created_at)
VALUES (
    'admin@mangwale.in',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4kQ2wfXqD8/xVqai', -- Change this hash
    'Super Admin',
    'super_admin',
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;
