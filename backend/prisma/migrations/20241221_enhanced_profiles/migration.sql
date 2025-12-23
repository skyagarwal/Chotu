-- Enhanced Profiles Migration
-- Stores enhanced profiles for stores, vendors, users, and riders
-- Links PHP backend IDs with PostgreSQL UUIDs for rich data storage

-- ========================================
-- 1. STORES TABLE - Core Store Data
-- ========================================
-- This is the central table that the scraper service references
-- php_store_id links to PHP/MySQL stores table

CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    php_store_id INTEGER UNIQUE NOT NULL,  -- Links to PHP/MySQL stores.id
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Zone/Location info
    zone_id INTEGER,
    city VARCHAR(100),
    area VARCHAR(100),
    pincode VARCHAR(10),
    
    -- Business identifiers (key for scraper matching)
    fssai_number VARCHAR(14),  -- 14-digit FSSAI license (mandatory for food)
    gst_number VARCHAR(15),    -- 15-character GSTIN
    pan_number VARCHAR(10),    -- 10-character PAN
    
    -- Store type/category
    module_id INTEGER,         -- food=1, parcel=5, ecommerce=6, grocery=16, etc.
    module_type VARCHAR(50),   -- 'food', 'parcel', 'grocery', 'ecommerce'
    cuisine_types TEXT[],      -- ['north_indian', 'chinese', etc.]
    store_category VARCHAR(50), -- 'restaurant', 'cloud_kitchen', 'kirana', etc.
    
    -- Operational info
    is_active BOOLEAN DEFAULT true,
    is_open BOOLEAN DEFAULT true,
    opens_at TIME,
    closes_at TIME,
    avg_preparation_time INTEGER, -- in minutes
    min_order_amount DECIMAL(10, 2),
    delivery_radius_km DECIMAL(5, 2),
    
    -- Ratings & metrics (internal)
    avg_rating DECIMAL(2, 1),
    total_reviews INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    
    -- Enhanced data from scraper
    competitor_data JSONB DEFAULT '{}',  -- { zomato: {...}, swiggy: {...} }
    external_ratings JSONB DEFAULT '{}', -- { zomato_rating: 4.2, swiggy_rating: 4.0 }
    price_comparison JSONB DEFAULT '{}', -- Aggregated price comparison data
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    synced_from_php_at TIMESTAMP,
    last_scraped_at TIMESTAMP
);

COMMENT ON TABLE stores IS 'Enhanced store profiles synced from PHP with scraper enrichments';
COMMENT ON COLUMN stores.php_store_id IS 'Links to PHP/MySQL stores.id';
COMMENT ON COLUMN stores.fssai_number IS '14-digit FSSAI license - exact match identifier for scrapers';
COMMENT ON COLUMN stores.gst_number IS '15-char GSTIN - exact match identifier for scrapers';
COMMENT ON COLUMN stores.competitor_data IS 'Aggregated data from Zomato/Swiggy scrapers';

CREATE INDEX IF NOT EXISTS idx_stores_php_id ON stores(php_store_id);
CREATE INDEX IF NOT EXISTS idx_stores_fssai ON stores(fssai_number) WHERE fssai_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stores_gst ON stores(gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stores_module ON stores(module_id);
CREATE INDEX IF NOT EXISTS idx_stores_zone ON stores(zone_id);
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores USING GIST (
    ll_to_earth(latitude::float, longitude::float)
);

-- ========================================
-- 2. VENDOR PROFILES - Store Owners/Employees
-- ========================================

CREATE TABLE IF NOT EXISTS vendor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    php_vendor_id INTEGER UNIQUE NOT NULL,  -- Links to PHP/MySQL vendors.id
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    
    -- Basic info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    
    -- Vendor type
    vendor_type VARCHAR(20) DEFAULT 'owner',  -- 'owner', 'employee', 'manager'
    role VARCHAR(50),                         -- 'kitchen', 'delivery', 'cashier', etc.
    
    -- Business info
    business_name VARCHAR(255),
    business_type VARCHAR(50),  -- 'sole_proprietor', 'partnership', 'pvt_ltd'
    
    -- Verification status
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP,
    verified_by VARCHAR(100),
    
    -- Documents (file URLs or encrypted storage refs)
    documents JSONB DEFAULT '{}',  -- { aadhar: 'url', pan: 'url', fssai: 'url' }
    
    -- Bank details (encrypted)
    bank_details_encrypted TEXT,
    
    -- Performance metrics
    avg_acceptance_rate DECIMAL(5, 2),  -- Order acceptance %
    avg_preparation_time INTEGER,       -- Minutes
    avg_response_time INTEGER,          -- Seconds
    total_orders_handled INTEGER DEFAULT 0,
    
    -- Communication preferences
    preferred_language VARCHAR(10) DEFAULT 'en',
    fcm_token TEXT,
    zone_wise_topic VARCHAR(100),  -- FCM topic for zone broadcasts
    whatsapp_enabled BOOLEAN DEFAULT true,
    
    -- Enhanced data from scraper (owner info sometimes visible)
    scraped_profile_data JSONB DEFAULT '{}',
    
    -- Timestamps
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    synced_from_php_at TIMESTAMP
);

COMMENT ON TABLE vendor_profiles IS 'Enhanced vendor (store owner/employee) profiles';
COMMENT ON COLUMN vendor_profiles.php_vendor_id IS 'Links to PHP/MySQL vendors.id';
COMMENT ON COLUMN vendor_profiles.scraped_profile_data IS 'Owner data visible on competitor platforms';

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_php_id ON vendor_profiles(php_vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_store ON vendor_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_phone ON vendor_profiles(phone);

-- ========================================
-- 3. USER PROFILES - SKIPPED
-- ========================================
-- User profiles already exist in user_profiles table (20251114_add_user_profiles.sql)
-- and user_preferences table (20241221_user_context_data_sources/migration.sql)
-- DO NOT duplicate that functionality here.
-- 
-- Existing tables handle:
-- - user_profiles: Comprehensive user preferences learned from conversations
-- - user_preferences: Dietary type, cuisines, payment preferences
-- - user_insights: AI-extracted insights
-- - conversation_insights: Extracted learnings from chats
--
-- PHP user sync is handled by UserContextService (MySQL queries)

-- ========================================
-- 4. RIDER PROFILES - Delivery Partners
-- ========================================

CREATE TABLE IF NOT EXISTS rider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    php_rider_id INTEGER UNIQUE NOT NULL,  -- Links to PHP/MySQL delivery_men.id
    
    -- Basic info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    
    -- Vehicle info
    vehicle_type VARCHAR(50),  -- 'bike', 'scooter', 'bicycle', 'auto', 'car'
    vehicle_number VARCHAR(20),
    vehicle_color VARCHAR(50),
    vehicle_brand VARCHAR(50),
    
    -- Location
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    home_latitude DECIMAL(10, 8),
    home_longitude DECIMAL(11, 8),
    preferred_zones INTEGER[],
    
    -- Documents (encrypted/URLs)
    documents JSONB DEFAULT '{}',  -- { driving_license: 'url', rc: 'url', aadhar: 'url' }
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP,
    background_check_status VARCHAR(50),  -- 'pending', 'cleared', 'flagged'
    
    -- Performance metrics
    total_deliveries INTEGER DEFAULT 0,
    avg_rating DECIMAL(2, 1),
    total_ratings INTEGER DEFAULT 0,
    on_time_delivery_rate DECIMAL(5, 2),  -- Percentage
    avg_delivery_time INTEGER,            -- Minutes
    total_distance_km DECIMAL(10, 2) DEFAULT 0,
    
    -- Earnings
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    current_week_earnings DECIMAL(10, 2) DEFAULT 0,
    incentives_earned DECIMAL(10, 2) DEFAULT 0,
    
    -- Communication
    preferred_language VARCHAR(10) DEFAULT 'en',
    fcm_token TEXT,
    whatsapp_enabled BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    current_order_id VARCHAR(100),  -- Currently assigned order
    last_online_at TIMESTAMP,
    
    -- Bank details (encrypted)
    bank_details_encrypted TEXT,
    
    -- Enhanced data (if rider also works for competitors)
    external_platforms JSONB DEFAULT '{}',  -- { zomato: true, swiggy: false, dunzo: true }
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    synced_from_php_at TIMESTAMP
);

COMMENT ON TABLE rider_profiles IS 'Enhanced delivery partner profiles';
COMMENT ON COLUMN rider_profiles.php_rider_id IS 'Links to PHP/MySQL delivery_men.id';
COMMENT ON COLUMN rider_profiles.external_platforms IS 'Other platforms rider works on';

CREATE INDEX IF NOT EXISTS idx_rider_profiles_php_id ON rider_profiles(php_rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_profiles_phone ON rider_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_rider_profiles_online ON rider_profiles(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_rider_profiles_location ON rider_profiles USING GIST (
    ll_to_earth(current_latitude::float, current_longitude::float)
) WHERE current_latitude IS NOT NULL;

-- ========================================
-- 5. STORE MENU ITEMS - For Price Comparison
-- ========================================

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    php_item_id INTEGER UNIQUE NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    discounted_price DECIMAL(10, 2),
    tax_percentage DECIMAL(5, 2) DEFAULT 0,
    
    -- Attributes
    is_veg BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_bestseller BOOLEAN DEFAULT false,
    
    -- Nutritional info
    calories INTEGER,
    serves_persons INTEGER DEFAULT 1,
    preparation_time INTEGER,  -- Minutes
    
    -- Ratings
    avg_rating DECIMAL(2, 1),
    total_ratings INTEGER DEFAULT 0,
    
    -- Competitor price comparison (from scraper)
    competitor_prices JSONB DEFAULT '{}',  -- { zomato: 180, swiggy: 175 }
    price_position VARCHAR(20),            -- 'cheapest', 'competitive', 'expensive'
    
    -- Media
    image_url TEXT,
    thumbnail_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    synced_from_php_at TIMESTAMP
);

COMMENT ON TABLE menu_items IS 'Store menu items with competitor price data';
COMMENT ON COLUMN menu_items.competitor_prices IS 'Prices on Zomato/Swiggy for same item';

CREATE INDEX IF NOT EXISTS idx_menu_items_php_id ON menu_items(php_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_store ON menu_items(store_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);

-- ========================================
-- 6. SYNC TRACKING TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS php_sync_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,  -- 'store', 'vendor', 'user', 'rider', 'item'
    php_id INTEGER NOT NULL,
    pg_id UUID,
    sync_direction VARCHAR(20),        -- 'php_to_pg', 'pg_to_php', 'bidirectional'
    sync_status VARCHAR(20),           -- 'success', 'failed', 'partial'
    changes_applied JSONB,             -- Fields that were updated
    error_message TEXT,
    synced_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(entity_type, php_id, synced_at)
);

CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON php_sync_log(entity_type, php_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON php_sync_log(sync_status);

-- ========================================
-- 7. HELPER FUNCTIONS
-- ========================================

-- Function to get store with competitor data
CREATE OR REPLACE FUNCTION get_store_enriched(p_php_store_id INTEGER)
RETURNS TABLE (
    store_id UUID,
    name VARCHAR,
    our_rating DECIMAL,
    zomato_rating DECIMAL,
    swiggy_rating DECIMAL,
    total_competitor_reviews INTEGER,
    fssai_verified BOOLEAN,
    gst_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.avg_rating,
        (s.external_ratings->>'zomato_rating')::DECIMAL,
        (s.external_ratings->>'swiggy_rating')::DECIMAL,
        COALESCE((s.competitor_data->'total_reviews')::INTEGER, 0),
        s.fssai_number IS NOT NULL,
        s.gst_number IS NOT NULL
    FROM stores s
    WHERE s.php_store_id = p_php_store_id;
END;
$$ LANGUAGE plpgsql;

-- Function to sync store from PHP to PostgreSQL
CREATE OR REPLACE FUNCTION sync_store_from_php(
    p_php_store_id INTEGER,
    p_name VARCHAR,
    p_address TEXT,
    p_lat DECIMAL,
    p_lng DECIMAL,
    p_module_id INTEGER,
    p_zone_id INTEGER,
    p_fssai VARCHAR DEFAULT NULL,
    p_gst VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_store_id UUID;
BEGIN
    INSERT INTO stores (
        php_store_id, name, address, latitude, longitude, 
        module_id, zone_id, fssai_number, gst_number, synced_from_php_at
    ) VALUES (
        p_php_store_id, p_name, p_address, p_lat, p_lng,
        p_module_id, p_zone_id, p_fssai, p_gst, NOW()
    )
    ON CONFLICT (php_store_id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        module_id = EXCLUDED.module_id,
        zone_id = EXCLUDED.zone_id,
        fssai_number = COALESCE(EXCLUDED.fssai_number, stores.fssai_number),
        gst_number = COALESCE(EXCLUDED.gst_number, stores.gst_number),
        synced_from_php_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_store_id;
    
    -- Log the sync
    INSERT INTO php_sync_log (entity_type, php_id, pg_id, sync_direction, sync_status)
    VALUES ('store', p_php_store_id, v_store_id, 'php_to_pg', 'success');
    
    RETURN v_store_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update store with scraped data
CREATE OR REPLACE FUNCTION update_store_competitor_data(
    p_store_id UUID,
    p_source VARCHAR,
    p_rating DECIMAL,
    p_review_count INTEGER,
    p_offers TEXT[],
    p_fssai VARCHAR DEFAULT NULL,
    p_gst VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE stores SET
        competitor_data = competitor_data || 
            jsonb_build_object(
                p_source, jsonb_build_object(
                    'rating', p_rating,
                    'review_count', p_review_count,
                    'offers', p_offers,
                    'scraped_at', NOW()
                )
            ),
        external_ratings = external_ratings || 
            jsonb_build_object(p_source || '_rating', p_rating),
        fssai_number = COALESCE(p_fssai, fssai_number),
        gst_number = COALESCE(p_gst, gst_number),
        last_scraped_at = NOW(),
        updated_at = NOW()
    WHERE id = p_store_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. VIEWS FOR COMMON QUERIES
-- ========================================

-- Stores with competitor comparison
CREATE OR REPLACE VIEW v_stores_comparison AS
SELECT 
    s.id,
    s.php_store_id,
    s.name,
    s.avg_rating as our_rating,
    (s.external_ratings->>'zomato_rating')::DECIMAL as zomato_rating,
    (s.external_ratings->>'swiggy_rating')::DECIMAL as swiggy_rating,
    s.total_reviews as our_reviews,
    (s.competitor_data->'zomato'->>'review_count')::INTEGER as zomato_reviews,
    (s.competitor_data->'swiggy'->>'review_count')::INTEGER as swiggy_reviews,
    CASE 
        WHEN s.fssai_number IS NOT NULL AND s.gst_number IS NOT NULL THEN 'verified'
        WHEN s.fssai_number IS NOT NULL OR s.gst_number IS NOT NULL THEN 'partial'
        ELSE 'unverified'
    END as verification_status,
    s.last_scraped_at
FROM stores s;

-- Vendor performance dashboard
CREATE OR REPLACE VIEW v_vendor_performance AS
SELECT 
    vp.id,
    vp.php_vendor_id,
    vp.first_name || ' ' || COALESCE(vp.last_name, '') as name,
    s.name as store_name,
    vp.vendor_type,
    vp.total_orders_handled,
    vp.avg_acceptance_rate,
    vp.avg_preparation_time,
    vp.is_verified,
    vp.last_login_at
FROM vendor_profiles vp
LEFT JOIN stores s ON vp.store_id = s.id;

-- Rider performance dashboard
CREATE OR REPLACE VIEW v_rider_performance AS
SELECT 
    rp.id,
    rp.php_rider_id,
    rp.first_name || ' ' || COALESCE(rp.last_name, '') as name,
    rp.vehicle_type,
    rp.total_deliveries,
    rp.avg_rating,
    rp.on_time_delivery_rate,
    rp.total_earnings,
    rp.is_online,
    rp.external_platforms
FROM rider_profiles rp;

-- ========================================
-- 9. ENABLE EXTENSIONS IF NEEDED
-- ========================================

-- For earth distance calculations
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- For text similarity (used in name matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================================
-- DONE
-- ========================================
