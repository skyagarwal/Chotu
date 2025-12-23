import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import axios, { AxiosInstance } from 'axios';

/**
 * 🔍 Search Query Expansion Service
 * 
 * Expands user queries to improve search results:
 * - Synonym expansion (veg -> vegetarian)
 * - Spelling correction (biriyani -> biryani)
 * - Query understanding (cheap -> price:low)
 * - Multi-language handling (Hindi/English)
 * - Category inference
 * - Local terms mapping (dal makhni -> dal makhani)
 */

export interface ExpandedQuery {
  original: string;
  expanded: string;
  terms: string[];
  synonyms: string[];
  corrections: string[];
  categoryHint?: string;
  priceRange?: { min?: number; max?: number };
  filters?: Record<string, any>;
  language?: 'en' | 'hi' | 'mixed';
}

@Injectable()
export class QueryExpansionService implements OnModuleInit {
  private readonly logger = new Logger(QueryExpansionService.name);
  private pool: Pool;
  private opensearch: AxiosInstance;

  // Local food synonym mappings
  private readonly synonyms: Record<string, string[]> = {
    // Vegetarian/Non-veg
    'veg': ['vegetarian', 'pure veg', 'शाकाहारी'],
    'vegetarian': ['veg', 'pure veg', 'शाकाहारी'],
    'nonveg': ['non-veg', 'non vegetarian', 'मांसाहारी'],
    'egg': ['anda', 'अंडा'],
    
    // Popular dishes
    'biryani': ['biriyani', 'briyani', 'biryaani', 'बिरयानी'],
    'pulao': ['pulav', 'pilaf', 'पुलाव'],
    'dal': ['daal', 'दाल', 'lentils'],
    'roti': ['chapati', 'chapatti', 'रोटी', 'फुल्का'],
    'paratha': ['parantha', 'पराठा'],
    'samosa': ['समोसा'],
    'dosa': ['डोसा', 'dose'],
    'idli': ['इडली'],
    'paneer': ['पनीर', 'cottage cheese'],
    'chicken': ['murgh', 'मुर्गा', 'चिकन'],
    'mutton': ['gosht', 'मटन', 'गोश्त'],
    'fish': ['machhi', 'मछली'],
    
    // Cuisines
    'chinese': ['चाइनीज़', 'indo-chinese'],
    'south indian': ['साउथ इंडियन', 'south'],
    'north indian': ['नॉर्थ इंडियन', 'north'],
    'punjabi': ['पंजाबी'],
    'mughlai': ['मुग़लई'],
    
    // Meal types
    'breakfast': ['नाश्ता', 'nashta', 'morning'],
    'lunch': ['लंच', 'दोपहर का खाना'],
    'dinner': ['डिनर', 'रात का खाना'],
    'snacks': ['स्नैक्स', 'halka fulka', 'हल्का फुल्का'],
    
    // Taste preferences
    'spicy': ['तीखा', 'teekha', 'mirchi'],
    'sweet': ['मीठा', 'meetha'],
    'mild': ['कम तीखा', 'not spicy'],
    
    // Price indicators
    'cheap': ['sasta', 'budget', 'सस्ता', 'affordable'],
    'premium': ['expensive', 'luxury', 'महंगा'],
    
    // Common misspellings
    'pizza': ['piza', 'pizzza', 'पिज़्ज़ा'],
    'burger': ['burgar', 'बर्गर'],
    'noodles': ['noodels', 'नूडल्स', 'maggi'],
    'momos': ['momo', 'मोमो', 'dumplings'],
    'thali': ['थाली', 'platter'],
  };

  // Price range mappings
  private readonly priceKeywords: Record<string, { min?: number; max?: number }> = {
    'cheap': { max: 100 },
    'budget': { max: 150 },
    'affordable': { max: 200 },
    'sasta': { max: 100 },
    'mid-range': { min: 150, max: 400 },
    'premium': { min: 400 },
    'expensive': { min: 500 },
    'luxury': { min: 700 },
  };

  // Category hints
  private readonly categoryKeywords: Record<string, string> = {
    'biryani': 'Rice & Biryani',
    'pizza': 'Pizza',
    'burger': 'Burgers',
    'momos': 'Momos & Dumplings',
    'dosa': 'South Indian',
    'idli': 'South Indian',
    'paratha': 'North Indian',
    'thali': 'Thali',
    'ice cream': 'Desserts',
    'cake': 'Bakery',
    'coffee': 'Beverages',
    'tea': 'Beverages',
    'juice': 'Beverages',
  };

  constructor(private readonly configService: ConfigService) {
    this.logger.log('🔍 QueryExpansionService initializing...');
  }

  async onModuleInit() {
    const databaseUrl = this.configService.get('DATABASE_URL') ||
      'postgresql://mangwale_config:config_secure_pass_2024@mangwale_postgres:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Initialize OpenSearch for spell check
    const opensearchUrl = this.configService.get('OPENSEARCH_URL') || 'http://opensearch:9200';
    this.opensearch = axios.create({
      baseURL: opensearchUrl,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    try {
      // Create synonym tracking table
      const client = await this.pool.connect();
      
      await client.query(`
        -- Custom synonyms added by admins
        CREATE TABLE IF NOT EXISTS search_synonyms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          term VARCHAR(100) NOT NULL,
          synonyms TEXT[] NOT NULL,
          module_id INTEGER,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(term, module_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_synonyms_term ON search_synonyms(term);
        
        -- Learned corrections from user behavior
        CREATE TABLE IF NOT EXISTS search_corrections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          misspelling VARCHAR(100) NOT NULL,
          correction VARCHAR(100) NOT NULL,
          confidence FLOAT DEFAULT 0.5,
          usage_count INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(misspelling)
        );
        
        CREATE INDEX IF NOT EXISTS idx_corrections_misspelling ON search_corrections(misspelling);
      `);
      
      client.release();
      this.logger.log('✅ QueryExpansionService initialized');
    } catch (error: any) {
      this.logger.error(`❌ Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Expand a search query
   */
  async expandQuery(query: string, moduleId?: number): Promise<ExpandedQuery> {
    const original = query.trim().toLowerCase();
    const terms = original.split(/\s+/);
    const synonyms: string[] = [];
    const corrections: string[] = [];
    let categoryHint: string | undefined;
    let priceRange: { min?: number; max?: number } | undefined;
    const filters: Record<string, any> = {};

    // Detect language
    const language = this.detectLanguage(original);

    // Process each term
    const expandedTerms = await Promise.all(
      terms.map(async (term) => {
        // Check for price keywords
        if (this.priceKeywords[term]) {
          priceRange = this.priceKeywords[term];
          return []; // Remove price keyword from search
        }

        // Check for category hints
        if (this.categoryKeywords[term]) {
          categoryHint = this.categoryKeywords[term];
        }

        // Check for veg/nonveg filters
        if (['veg', 'vegetarian', 'शाकाहारी'].includes(term)) {
          filters['is_veg'] = true;
          return ['vegetarian', 'veg'];
        }
        if (['nonveg', 'non-veg', 'मांसाहारी'].includes(term)) {
          filters['is_veg'] = false;
          return ['non-veg'];
        }

        // Get synonyms from static mapping
        const termSynonyms = this.synonyms[term] || [];
        synonyms.push(...termSynonyms);

        // Get custom synonyms from database
        const customSynonyms = await this.getCustomSynonyms(term, moduleId);
        synonyms.push(...customSynonyms);

        // Check for spelling corrections
        const correction = await this.getSpellingCorrection(term);
        if (correction && correction !== term) {
          corrections.push(`${term} → ${correction}`);
          return [correction, ...this.synonyms[correction] || []];
        }

        return [term, ...termSynonyms.slice(0, 2)]; // Limit synonyms per term
      }),
    );

    // Build expanded query
    const allTerms = expandedTerms.flat().filter(Boolean);
    const uniqueTerms = [...new Set(allTerms)];
    const expanded = uniqueTerms.join(' ');

    return {
      original,
      expanded,
      terms: uniqueTerms,
      synonyms: [...new Set(synonyms)],
      corrections,
      categoryHint,
      priceRange,
      filters,
      language,
    };
  }

  /**
   * Detect language of query (English, Hindi, Mixed)
   */
  private detectLanguage(query: string): 'en' | 'hi' | 'mixed' {
    // Devanagari script range
    const hindiChars = query.match(/[\u0900-\u097F]/g)?.length || 0;
    const englishChars = query.match(/[a-zA-Z]/g)?.length || 0;

    if (hindiChars > 0 && englishChars > 0) return 'mixed';
    if (hindiChars > englishChars) return 'hi';
    return 'en';
  }

  /**
   * Get custom synonyms from database
   */
  private async getCustomSynonyms(term: string, moduleId?: number): Promise<string[]> {
    try {
      const result = await this.pool.query(
        `SELECT synonyms FROM search_synonyms 
         WHERE term = $1 AND is_active = true
           AND (module_id IS NULL OR module_id = $2)`,
        [term, moduleId],
      );

      if (result.rows.length > 0) {
        return result.rows[0].synonyms;
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get spelling correction using Levenshtein distance or OpenSearch suggest
   */
  private async getSpellingCorrection(term: string): Promise<string | null> {
    // First check database corrections
    try {
      const result = await this.pool.query(
        `SELECT correction FROM search_corrections 
         WHERE misspelling = $1 AND confidence > 0.5`,
        [term],
      );

      if (result.rows.length > 0) {
        return result.rows[0].correction;
      }
    } catch (error) {
      // Continue to OpenSearch
    }

    // Try OpenSearch suggest
    try {
      const response = await this.opensearch.post('/products/_search', {
        suggest: {
          text: term,
          spelling: {
            term: {
              field: 'name',
              suggest_mode: 'popular',
            },
          },
        },
      });

      const suggestions = response.data?.suggest?.spelling?.[0]?.options;
      if (suggestions?.length > 0) {
        return suggestions[0].text;
      }
    } catch (error) {
      // Ignore OpenSearch errors
    }

    return null;
  }

  /**
   * Learn correction from user behavior
   */
  async learnCorrection(
    misspelling: string,
    correction: string,
    confidence: number = 0.5,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO search_corrections (misspelling, correction, confidence)
         VALUES ($1, $2, $3)
         ON CONFLICT (misspelling) 
         DO UPDATE SET 
           confidence = LEAST(search_corrections.confidence + 0.1, 1.0),
           usage_count = search_corrections.usage_count + 1`,
        [misspelling.toLowerCase(), correction.toLowerCase(), confidence],
      );
    } catch (error: any) {
      this.logger.error(`Failed to learn correction: ${error.message}`);
    }
  }

  /**
   * Add custom synonym
   */
  async addSynonym(
    term: string,
    synonyms: string[],
    moduleId?: number,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO search_synonyms (term, synonyms, module_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (term, module_id) 
         DO UPDATE SET synonyms = EXCLUDED.synonyms`,
        [term.toLowerCase(), synonyms.map(s => s.toLowerCase()), moduleId],
      );
    } catch (error: any) {
      this.logger.error(`Failed to add synonym: ${error.message}`);
    }
  }

  /**
   * Get expansion stats
   */
  async getStats(): Promise<{
    totalSynonyms: number;
    totalCorrections: number;
    topCorrections: Array<{ misspelling: string; correction: string; count: number }>;
  }> {
    try {
      const synonymsCount = await this.pool.query(
        `SELECT COUNT(*) as count FROM search_synonyms WHERE is_active = true`,
      );

      const correctionsCount = await this.pool.query(
        `SELECT COUNT(*) as count FROM search_corrections`,
      );

      const topCorrections = await this.pool.query(
        `SELECT misspelling, correction, usage_count 
         FROM search_corrections 
         ORDER BY usage_count DESC 
         LIMIT 10`,
      );

      return {
        totalSynonyms: parseInt(synonymsCount.rows[0]?.count || '0') + Object.keys(this.synonyms).length,
        totalCorrections: parseInt(correctionsCount.rows[0]?.count || '0'),
        topCorrections: topCorrections.rows.map(r => ({
          misspelling: r.misspelling,
          correction: r.correction,
          count: parseInt(r.usage_count),
        })),
      };
    } catch (error: any) {
      return {
        totalSynonyms: Object.keys(this.synonyms).length,
        totalCorrections: 0,
        topCorrections: [],
      };
    }
  }
}
