-- Enhanced Food Ordering System Migration
-- Adds support for:
-- 1. Character contexts (food ordering, support, etc.)
-- 2. Character knowledge base
-- 3. Character response templates
-- 4. Item serving information
-- 5. Review aggregations

-- ================================================================
-- CHARACTER ENHANCEMENT TABLES
-- ================================================================

-- Character contexts (when to use different personality modes)
CREATE TABLE IF NOT EXISTS voice_character_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES voice_characters(id) ON DELETE CASCADE,
  context_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  system_prompt_modifier TEXT,
  tone_adjustment JSONB DEFAULT '{}',
  greeting_templates TEXT[] DEFAULT '{}',
  farewell_templates TEXT[] DEFAULT '{}',
  error_templates TEXT[] DEFAULT '{}',
  upsell_templates TEXT[] DEFAULT '{}',
  confirmation_templates TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_character_context UNIQUE(character_id, context_name)
);

CREATE INDEX IF NOT EXISTS idx_char_context_name ON voice_character_contexts(context_name);
CREATE INDEX IF NOT EXISTS idx_char_context_active ON voice_character_contexts(is_active) WHERE is_active = true;

-- Character knowledge base (facts the character knows)
CREATE TABLE IF NOT EXISTS voice_character_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES voice_characters(id) ON DELETE CASCADE,
  topic VARCHAR(100) NOT NULL,
  subtopic VARCHAR(100),
  knowledge_text TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'hi',
  use_in_prompts BOOLEAN DEFAULT true,
  trigger_keywords TEXT[] DEFAULT '{}',
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_char_knowledge_topic ON voice_character_knowledge(topic);
CREATE INDEX IF NOT EXISTS idx_char_knowledge_char ON voice_character_knowledge(character_id);

-- Character response bank (curated responses)
CREATE TABLE IF NOT EXISTS voice_character_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES voice_characters(id) ON DELETE CASCADE,
  intent VARCHAR(100) NOT NULL,
  sub_intent VARCHAR(100),
  language VARCHAR(10) DEFAULT 'hi',
  response_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',  -- {{user_name}}, {{item_name}}, etc.
  tone VARCHAR(50),  -- excited, apologetic, helpful
  use_for_tts BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  use_count INT DEFAULT 0,
  success_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_char_response_intent ON voice_character_responses(intent);
CREATE INDEX IF NOT EXISTS idx_char_response_char ON voice_character_responses(character_id);

-- ================================================================
-- ITEM SERVING INFORMATION
-- ================================================================

-- Food item serving metadata (how many people an item serves)
CREATE TABLE IF NOT EXISTS food_item_servings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(100) NOT NULL,  -- OpenSearch item ID
  serves_min INT DEFAULT 1,
  serves_max INT DEFAULT 1,
  serving_size VARCHAR(50),  -- small, regular, large, family
  is_shareable BOOLEAN DEFAULT false,
  recommended_for_group_of INT,
  calories_estimate INT,
  portion_notes TEXT,
  source VARCHAR(50) DEFAULT 'manual',  -- manual, scraped, calculated
  confidence DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_item_serving UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_servings_shareable ON food_item_servings(is_shareable) WHERE is_shareable = true;

-- ================================================================
-- REVIEW AGGREGATION
-- ================================================================

-- Aggregated item review statistics (updated periodically)
CREATE TABLE IF NOT EXISTS item_review_stats (
  item_id VARCHAR(100) PRIMARY KEY,
  store_id VARCHAR(100),
  total_reviews INT DEFAULT 0,
  avg_rating DECIMAL(3,2),
  rating_distribution JSONB DEFAULT '{"5":0,"4":0,"3":0,"2":0,"1":0}',
  sentiment_score DECIMAL(3,2),  -- -1 to 1
  top_positive_keywords TEXT[] DEFAULT '{}',
  top_negative_keywords TEXT[] DEFAULT '{}',
  common_praises TEXT[] DEFAULT '{}',
  common_complaints TEXT[] DEFAULT '{}',
  repeat_order_rate DECIMAL(3,2),
  avg_delivery_time_actual INT,  -- Actual vs promised
  photo_review_count INT DEFAULT 0,
  last_review_date TIMESTAMP,
  last_aggregated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_stats_store ON item_review_stats(store_id);
CREATE INDEX IF NOT EXISTS idx_review_stats_rating ON item_review_stats(avg_rating DESC);

-- Store review aggregations
CREATE TABLE IF NOT EXISTS store_review_stats (
  store_id VARCHAR(100) PRIMARY KEY,
  total_reviews INT DEFAULT 0,
  avg_rating DECIMAL(3,2),
  food_rating DECIMAL(3,2),
  delivery_rating DECIMAL(3,2),
  packaging_rating DECIMAL(3,2),
  value_rating DECIMAL(3,2),
  rating_distribution JSONB DEFAULT '{"5":0,"4":0,"3":0,"2":0,"1":0}',
  sentiment_score DECIMAL(3,2),
  specialties TEXT[] DEFAULT '{}',  -- What they're known for
  top_items TEXT[] DEFAULT '{}',  -- Best selling items
  peak_hours TEXT[] DEFAULT '{}',  -- Busy hours
  avg_delivery_time INT,
  on_time_delivery_rate DECIMAL(3,2),
  repeat_customer_rate DECIMAL(3,2),
  last_aggregated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- GROUP ORDER TRACKING
-- ================================================================

-- Track group order patterns for learning
CREATE TABLE IF NOT EXISTS group_order_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_size INT NOT NULL,
  hunger_level VARCHAR(20),
  dietary_types TEXT[] DEFAULT '{}',
  budget_range VARCHAR(50),  -- 'under_500', '500_1000', '1000_2000', 'above_2000'
  items_ordered JSONB NOT NULL,  -- Array of {item_id, quantity, category}
  total_amount DECIMAL(10,2),
  per_person_amount DECIMAL(10,2),
  customer_satisfaction INT,  -- 1-5 rating
  fully_consumed BOOLEAN,  -- Did they finish everything?
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_order_size ON group_order_patterns(group_size);
CREATE INDEX IF NOT EXISTS idx_group_order_budget ON group_order_patterns(budget_range);

-- ================================================================
-- SEED DATA FOR CHOTU
-- ================================================================

-- Insert Chotu's food ordering context
INSERT INTO voice_character_contexts (character_id, context_name, display_name, description, system_prompt_modifier, greeting_templates, upsell_templates, is_active)
SELECT 
  id,
  'food_order',
  'Food Order Mode',
  'Context for food ordering conversations',
  'You are helping a customer order food. Be enthusiastic about good food choices. Use food-related expressions.',
  ARRAY[
    'Namaste {{user_name}}! Aaj kya khana hai? 🍕',
    'Hello! Bhook lagi hai kya? Main help karta hoon! 🍔',
    'Arey {{user_name}}! Kuch tasty mangwate hain? 😋'
  ],
  ARRAY[
    'Ek cold drink bhi le lo? Khane ke saath accha lagega!',
    'Dessert try karoge? Gulab Jamun bahut acche hain yahan ke!',
    'Combo le lo na, ₹{{savings}} bach jayenge!'
  ],
  true
FROM voice_characters WHERE name = 'chotu'
ON CONFLICT (character_id, context_name) DO UPDATE SET
  greeting_templates = EXCLUDED.greeting_templates,
  upsell_templates = EXCLUDED.upsell_templates;

-- Insert Chotu's support context
INSERT INTO voice_character_contexts (character_id, context_name, display_name, description, system_prompt_modifier, greeting_templates, error_templates, is_active)
SELECT 
  id,
  'support',
  'Support Mode',
  'Context for customer support',
  'You are helping with a customer issue. Be apologetic but solution-focused. Never blame the customer.',
  ARRAY[
    'Haan ji, batao kya problem hai? Main solve karta hoon.',
    'Sorry for the trouble! Kya hua batao?'
  ],
  ARRAY[
    'Maaf kijiye, yeh ho gaya. Main abhi fix karta hoon.',
    'Sorry sahab/didi, galti ho gayi. Abhi theek karte hain.',
    'Arey, yeh nahi hona chahiye tha. Main manager ko bolta hoon.'
  ],
  true
FROM voice_characters WHERE name = 'chotu'
ON CONFLICT (character_id, context_name) DO UPDATE SET
  greeting_templates = EXCLUDED.greeting_templates,
  error_templates = EXCLUDED.error_templates;

-- Insert Chotu's knowledge about Nashik food
INSERT INTO voice_character_knowledge (character_id, topic, subtopic, knowledge_text, trigger_keywords, language)
SELECT 
  id,
  'local_food',
  'nashik_specialties',
  'Nashik famous for Misal Pav, Sabudana Vada, and wine country snacks. Panchavati area has best street food. College Road famous for evening snacks.',
  ARRAY['nashik', 'local', 'famous', 'specialty', 'best'],
  'hinglish'
FROM voice_characters WHERE name = 'chotu';

INSERT INTO voice_character_knowledge (character_id, topic, subtopic, knowledge_text, trigger_keywords, language)
SELECT 
  id,
  'pricing',
  'value_comparison',
  'Mangwale pricing is better because: No platform fee, No packaging charge, Lower delivery fee (₹10/km vs ₹15/km), No surge pricing during peak hours. Average savings of ₹50-100 per order.',
  ARRAY['price', 'charge', 'fee', 'expensive', 'cheap', 'why mangwale', 'better'],
  'hinglish'
FROM voice_characters WHERE name = 'chotu';

-- Insert Chotu's response templates
INSERT INTO voice_character_responses (character_id, intent, language, response_template, variables, tone)
SELECT 
  id,
  'group_order_confirm',
  'hinglish',
  'Perfect! {{group_size}} logon ke liye {{item_count}} items, total ₹{{total}}. Per person sirf ₹{{per_person}}! Sab ka pet bhar jayega! 😋',
  ARRAY['group_size', 'item_count', 'total', 'per_person'],
  'excited'
FROM voice_characters WHERE name = 'chotu';

INSERT INTO voice_character_responses (character_id, intent, language, response_template, variables, tone)
SELECT 
  id,
  'budget_achieved',
  'hinglish',
  'Budget mein fit ho gaya! ₹{{budget}} mein se ₹{{spent}} use kiya, ₹{{remaining}} bach gaye! 💰',
  ARRAY['budget', 'spent', 'remaining'],
  'helpful'
FROM voice_characters WHERE name = 'chotu';

INSERT INTO voice_character_responses (character_id, intent, language, response_template, variables, tone)
SELECT 
  id,
  'time_promise',
  'hinglish',
  '{{restaurant_name}} se {{delivery_time}} minutes mein pahunch jayega! Garam garam khana milega! 🏍️',
  ARRAY['restaurant_name', 'delivery_time'],
  'confident'
FROM voice_characters WHERE name = 'chotu';

INSERT INTO voice_character_responses (character_id, intent, language, response_template, variables, tone)
SELECT 
  id,
  'savings_highlight',
  'hinglish',
  'Arey waaah! Mangwale se order karke ₹{{savings}} bacha liye! Other apps pe yeh ₹{{competitor_price}} lagta. Smart choice! 🎉',
  ARRAY['savings', 'competitor_price'],
  'excited'
FROM voice_characters WHERE name = 'chotu';

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Composite index for character context lookup
CREATE INDEX IF NOT EXISTS idx_char_context_lookup 
ON voice_character_contexts(character_id, context_name, is_active);

-- Full text search on knowledge
CREATE INDEX IF NOT EXISTS idx_knowledge_text_search 
ON voice_character_knowledge USING gin(to_tsvector('english', knowledge_text));

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Function to get character with context
CREATE OR REPLACE FUNCTION get_character_with_context(
  p_character_name VARCHAR,
  p_context_name VARCHAR DEFAULT 'general'
)
RETURNS TABLE (
  character_id UUID,
  character_name VARCHAR,
  display_name VARCHAR,
  personality JSONB,
  context_prompt TEXT,
  greeting_templates TEXT[],
  error_templates TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vc.id,
    vc.name,
    vc.display_name,
    vc.personality,
    vcc.system_prompt_modifier,
    vcc.greeting_templates,
    vcc.error_templates
  FROM voice_characters vc
  LEFT JOIN voice_character_contexts vcc 
    ON vcc.character_id = vc.id 
    AND vcc.context_name = p_context_name
    AND vcc.is_active = true
  WHERE vc.name = p_character_name
  AND vc.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get random response template
CREATE OR REPLACE FUNCTION get_random_response(
  p_character_name VARCHAR,
  p_intent VARCHAR,
  p_language VARCHAR DEFAULT 'hinglish'
)
RETURNS TEXT AS $$
DECLARE
  v_response TEXT;
BEGIN
  SELECT response_template INTO v_response
  FROM voice_character_responses vcr
  JOIN voice_characters vc ON vcr.character_id = vc.id
  WHERE vc.name = p_character_name
  AND vcr.intent = p_intent
  AND vcr.language = p_language
  AND vcr.is_active = true
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Update use count
  IF v_response IS NOT NULL THEN
    UPDATE voice_character_responses
    SET use_count = use_count + 1
    WHERE response_template = v_response;
  END IF;
  
  RETURN v_response;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE voice_character_contexts IS 'Different personality modes for each character (food ordering, support, etc.)';
COMMENT ON TABLE voice_character_knowledge IS 'Facts and knowledge the character can reference in conversations';
COMMENT ON TABLE voice_character_responses IS 'Pre-written response templates for common intents';
COMMENT ON TABLE food_item_servings IS 'Serving size information for group order calculations';
COMMENT ON TABLE item_review_stats IS 'Aggregated review statistics for search ranking';
COMMENT ON TABLE group_order_patterns IS 'Historical group order data for learning optimal recommendations';
