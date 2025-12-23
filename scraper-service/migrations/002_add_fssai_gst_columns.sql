-- Migration: Add FSSAI and GST columns for exact vendor matching
-- These are unique identifiers that provide 100% confidence matching
-- FSSAI: 14-digit food license number (mandatory in India)
-- GST/GSTIN: 15-character tax registration number

-- Add columns to store_competitor_mapping for verified FSSAI/GST
ALTER TABLE store_competitor_mapping 
ADD COLUMN IF NOT EXISTS fssai_number VARCHAR(14),
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15),
ADD COLUMN IF NOT EXISTS match_method VARCHAR(20) DEFAULT 'name_similarity';

COMMENT ON COLUMN store_competitor_mapping.fssai_number IS '14-digit FSSAI food license number - unique identifier';
COMMENT ON COLUMN store_competitor_mapping.gst_number IS '15-character GSTIN tax registration - unique identifier';
COMMENT ON COLUMN store_competitor_mapping.match_method IS 'How match was made: fssai_match, gst_match, name_similarity';

-- Add columns to competitor_restaurants for scraped FSSAI/GST
ALTER TABLE competitor_restaurants
ADD COLUMN IF NOT EXISTS fssai_number VARCHAR(14),
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15);

COMMENT ON COLUMN competitor_restaurants.fssai_number IS 'FSSAI license number scraped from competitor platform';
COMMENT ON COLUMN competitor_restaurants.gst_number IS 'GST number scraped from competitor platform';

-- Create indexes for efficient FSSAI/GST lookups
CREATE INDEX IF NOT EXISTS idx_competitor_restaurants_fssai 
ON competitor_restaurants(fssai_number) WHERE fssai_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competitor_restaurants_gst 
ON competitor_restaurants(gst_number) WHERE gst_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_competitor_mapping_fssai 
ON store_competitor_mapping(fssai_number) WHERE fssai_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_competitor_mapping_gst 
ON store_competitor_mapping(gst_number) WHERE gst_number IS NOT NULL;

-- Add FSSAI column to stores table if not exists (for our vendor data)
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS fssai_number VARCHAR(14),
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15);

CREATE INDEX IF NOT EXISTS idx_stores_fssai 
ON stores(fssai_number) WHERE fssai_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_gst 
ON stores(gst_number) WHERE gst_number IS NOT NULL;

COMMENT ON COLUMN stores.fssai_number IS '14-digit FSSAI license number for vendor';
COMMENT ON COLUMN stores.gst_number IS '15-character GSTIN for vendor';

-- Function to match stores by FSSAI/GST (100% confidence match)
CREATE OR REPLACE FUNCTION match_store_by_identifiers(
    p_store_id UUID,
    p_source VARCHAR(20)
) RETURNS TABLE (
    external_id VARCHAR(100),
    external_url TEXT,
    match_confidence DECIMAL(3, 2),
    match_method VARCHAR(20)
) AS $$
DECLARE
    v_fssai VARCHAR(14);
    v_gst VARCHAR(15);
    v_store_name VARCHAR(255);
    v_store_address TEXT;
BEGIN
    -- Get store's FSSAI and GST
    SELECT s.fssai_number, s.gst_number, s.name, s.address
    INTO v_fssai, v_gst, v_store_name, v_store_address
    FROM stores s WHERE s.id = p_store_id;

    -- First try FSSAI match (100% confidence)
    IF v_fssai IS NOT NULL THEN
        RETURN QUERY
        SELECT cr.external_id, cr.url, 1.00::DECIMAL(3,2), 'fssai_match'::VARCHAR(20)
        FROM competitor_restaurants cr
        WHERE cr.source = p_source
        AND cr.fssai_number = v_fssai
        LIMIT 1;
        
        IF FOUND THEN RETURN; END IF;
    END IF;

    -- Then try GST match (100% confidence)
    IF v_gst IS NOT NULL THEN
        RETURN QUERY
        SELECT cr.external_id, cr.url, 1.00::DECIMAL(3,2), 'gst_match'::VARCHAR(20)
        FROM competitor_restaurants cr
        WHERE cr.source = p_source
        AND cr.gst_number = v_gst
        LIMIT 1;
        
        IF FOUND THEN RETURN; END IF;
    END IF;

    -- Fall back to name similarity (lower confidence)
    RETURN QUERY
    SELECT cr.external_id, cr.url, 
           GREATEST(
               similarity(LOWER(cr.name), LOWER(v_store_name)),
               0.50
           )::DECIMAL(3,2),
           'name_similarity'::VARCHAR(20)
    FROM competitor_restaurants cr
    WHERE cr.source = p_source
    AND similarity(LOWER(cr.name), LOWER(v_store_name)) > 0.3
    ORDER BY similarity(LOWER(cr.name), LOWER(v_store_name)) DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_trgm extension for similarity function (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
