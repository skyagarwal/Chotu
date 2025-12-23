export class ClassificationResultDto {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  tone?: 'happy' | 'angry' | 'urgent' | 'neutral' | 'frustrated' | 'polite' | 'confused';
  sentiment?: 'positive' | 'negative' | 'neutral';
  urgency?: number; // 0-1 scale
  language: string;
  provider: 'indicbert' | 'heuristic' | 'fallback' | 'llm';
  processingTimeMs: number;
  llmReasoning?: string;  // Added: Explanation from LLM when used as fallback
}

export class EntityDto {
  type: string; // 'location', 'product', 'date', 'phone', etc.
  value: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}
