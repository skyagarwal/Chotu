-- Scraper Service Database Schema
-- This migration adds tables for the scraper microservice

-- Scrape jobs queue
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id VARCHAR(50) PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    store_id UUID,
    store_name VARCHAR(255) NOT NULL,
    store_address TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    priority VARCHAR(10) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    CONSTRAINT fk_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
);

-- Store to competitor mapping
CREATE TABLE IF NOT EXISTS store_competitor_mapping (
    id SERIAL PRIMARY KEY,
    store_id UUID NOT NULL,
    source VARCHAR(20) NOT NULL,  -- 'zomato', 'swiggy'
    external_id VARCHAR(100) NOT NULL,
    external_url TEXT,
    match_confidence DECIMAL(3, 2),
    matched_at TIMESTAMP DEFAULT NOW(),
    verified_by_admin BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    UNIQUE(store_id, source),
    CONSTRAINT fk_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Competitor restaurants (scraped data)
CREATE TABLE IF NOT EXISTS competitor_restaurants (
    id SERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT,
    rating DECIMAL(2, 1),
    review_count VARCHAR(50),
    cuisine TEXT[],
    address TEXT,
    price_for_two INTEGER,
    delivery_time VARCHAR(50),
    offers TEXT[],
    scraped_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source, external_id)
);

-- Competitor reviews (scraped)
CREATE TABLE IF NOT EXISTS competitor_reviews (
    id SERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    external_restaurant_id VARCHAR(100) NOT NULL,
    author_name VARCHAR(100),
    rating DECIMAL(2, 1),
    text TEXT,
    review_date VARCHAR(50),
    likes INTEGER DEFAULT 0,
    photos INTEGER DEFAULT 0,
    scraped_at TIMESTAMP DEFAULT NOW()
);

-- Competitor pricing (menu items with prices)
CREATE TABLE IF NOT EXISTS competitor_pricing (
    id SERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    external_restaurant_id VARCHAR(100) NOT NULL,
    restaurant_name VARCHAR(255),
    item_name VARCHAR(255) NOT NULL,
    price INTEGER,
    category VARCHAR(100),
    is_veg BOOLEAN,
    is_bestseller BOOLEAN DEFAULT FALSE,
    in_stock BOOLEAN DEFAULT TRUE,
    item_rating DECIMAL(2, 1),
    scraped_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source, external_restaurant_id, item_name)
);

-- Price comparison view
CREATE OR REPLACE VIEW v_price_comparison AS
SELECT 
    s.id as store_id,
    s.name as store_name,
    m.item_name,
    m.price as our_price,
    cp_zomato.price as zomato_price,
    cp_swiggy.price as swiggy_price,
    CASE 
        WHEN m.price < COALESCE(cp_zomato.price, m.price) AND m.price < COALESCE(cp_swiggy.price, m.price)
        THEN 'cheapest'
        WHEN m.price > COALESCE(cp_zomato.price, m.price) OR m.price > COALESCE(cp_swiggy.price, m.price)
        THEN 'expensive'
        ELSE 'competitive'
    END as price_position
FROM stores s
JOIN store_competitor_mapping scm_zomato ON s.id = scm_zomato.store_id AND scm_zomato.source = 'zomato'
JOIN store_competitor_mapping scm_swiggy ON s.id = scm_swiggy.store_id AND scm_swiggy.source = 'swiggy'
JOIN menu_items m ON s.id = m.store_id
LEFT JOIN competitor_pricing cp_zomato ON scm_zomato.external_id = cp_zomato.external_restaurant_id 
    AND cp_zomato.source = 'zomato' 
    AND LOWER(cp_zomato.item_name) = LOWER(m.item_name)
LEFT JOIN competitor_pricing cp_swiggy ON scm_swiggy.external_id = cp_swiggy.external_restaurant_id 
    AND cp_swiggy.source = 'swiggy' 
    AND LOWER(cp_swiggy.item_name) = LOWER(m.item_name);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created ON scrape_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_competitor_mapping_store ON store_competitor_mapping(store_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_restaurant ON competitor_pricing(external_restaurant_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_item ON competitor_pricing(item_name);
CREATE INDEX IF NOT EXISTS idx_competitor_reviews_restaurant ON competitor_reviews(external_restaurant_id);

-- Function to get competitor pricing for a store
CREATE OR REPLACE FUNCTION get_competitor_pricing(p_store_id UUID)
RETURNS TABLE (
    item_name VARCHAR,
    our_price INTEGER,
    zomato_price INTEGER,
    swiggy_price INTEGER,
    avg_competitor_price INTEGER,
    price_diff INTEGER,
    recommendation VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.name as item_name,
        mi.price as our_price,
        cp_z.price as zomato_price,
        cp_s.price as swiggy_price,
        COALESCE((cp_z.price + cp_s.price) / 2, cp_z.price, cp_s.price)::INTEGER as avg_competitor_price,
        (mi.price - COALESCE((cp_z.price + cp_s.price) / 2, cp_z.price, cp_s.price))::INTEGER as price_diff,
        CASE 
            WHEN mi.price < COALESCE(cp_z.price, mi.price) * 0.9 AND mi.price < COALESCE(cp_s.price, mi.price) * 0.9
            THEN 'UNDERPRICED - consider increasing'
            WHEN mi.price > COALESCE(cp_z.price, mi.price) * 1.1 AND mi.price > COALESCE(cp_s.price, mi.price) * 1.1
            THEN 'OVERPRICED - consider decreasing'
            ELSE 'COMPETITIVE'
        END as recommendation
    FROM menu_items mi
    LEFT JOIN store_competitor_mapping scm_z ON mi.store_id = scm_z.store_id AND scm_z.source = 'zomato'
    LEFT JOIN competitor_pricing cp_z ON scm_z.external_id = cp_z.external_restaurant_id 
        AND cp_z.source = 'zomato' AND LOWER(cp_z.item_name) LIKE '%' || LOWER(mi.name) || '%'
    LEFT JOIN store_competitor_mapping scm_s ON mi.store_id = scm_s.store_id AND scm_s.source = 'swiggy'
    LEFT JOIN competitor_pricing cp_s ON scm_s.external_id = cp_s.external_restaurant_id 
        AND cp_s.source = 'swiggy' AND LOWER(cp_s.item_name) LIKE '%' || LOWER(mi.name) || '%'
    WHERE mi.store_id = p_store_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-queue scrape when new store is added
CREATE OR REPLACE FUNCTION auto_queue_scrape()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO scrape_jobs (id, source, store_id, store_name, store_address, lat, lng, priority, status)
    VALUES (
        'auto_' || EXTRACT(EPOCH FROM NOW()) || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
        'both',
        NEW.id,
        NEW.name,
        NEW.address,
        NEW.latitude,
        NEW.longitude,
        'normal',
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable auto-scrape for new stores (optional - comment out if not wanted)
-- DROP TRIGGER IF EXISTS tr_auto_scrape_new_store ON stores;
-- CREATE TRIGGER tr_auto_scrape_new_store
--     AFTER INSERT ON stores
--     FOR EACH ROW
--     EXECUTE FUNCTION auto_queue_scrape();
