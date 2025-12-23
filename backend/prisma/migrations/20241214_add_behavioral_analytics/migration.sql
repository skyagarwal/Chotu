-- Add behavioral analytics columns to user_profiles
-- Migration: Add RFM scoring and behavioral analytics fields

-- RFM (Recency-Frequency-Monetary) scoring
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS rfm_segment VARCHAR(30),
ADD COLUMN IF NOT EXISTS rfm_score VARCHAR(3),  -- e.g., "543"

-- Purchase patterns
ADD COLUMN IF NOT EXISTS preferred_order_time VARCHAR(20),
ADD COLUMN IF NOT EXISTS avg_basket_size DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS avg_order_value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS order_frequency_days INTEGER,

-- Engagement metrics
ADD COLUMN IF NOT EXISTS search_to_click_ratio DECIMAL(5, 3),
ADD COLUMN IF NOT EXISTS repeat_item_rate DECIMAL(5, 3),
ADD COLUMN IF NOT EXISTS browse_only_rate DECIMAL(5, 3),

-- Behavioral analytics timestamp
ADD COLUMN IF NOT EXISTS behavioral_updated_at TIMESTAMP;

-- Add index for segment-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_rfm_segment ON user_profiles(rfm_segment);
CREATE INDEX IF NOT EXISTS idx_user_profiles_behavioral_updated ON user_profiles(behavioral_updated_at);

-- Create user_orders table if not exists (for tracking orders from PHP backend)
CREATE TABLE IF NOT EXISTS user_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    order_id VARCHAR(50),
    module VARCHAR(20) DEFAULT 'food',
    status VARCHAR(30) DEFAULT 'placed',
    order_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_orders_user_id ON user_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_created_at ON user_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_user_orders_status ON user_orders(status);

-- Create item_cache table for category lookups
CREATE TABLE IF NOT EXISTS item_cache (
    item_id INTEGER PRIMARY KEY,
    module VARCHAR(20) DEFAULT 'food',
    item_data JSONB DEFAULT '{}',
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comment explaining the RFM segments
COMMENT ON COLUMN user_profiles.rfm_segment IS 
'Customer segment based on RFM analysis: champion, loyal, potential_loyalist, new_customer, promising, need_attention, about_to_sleep, at_risk, hibernating, lost';

COMMENT ON COLUMN user_profiles.rfm_score IS 
'3-digit score (1-5 each): Recency, Frequency, Monetary. e.g., 543 = Recent(5), Frequent(4), Medium-spend(3)';
