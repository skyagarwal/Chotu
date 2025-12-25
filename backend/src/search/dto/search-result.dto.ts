export class SearchResultDto {
  results: SearchHit[];
  total: number;
  took: number; // ms
  searchType: 'keyword' | 'semantic' | 'hybrid' | 'fallback' | 'intent';
  query: string;
}

export class SearchHit {
  id: string;
  index: string;
  score: number;
  source: Record<string, any>;
  highlights?: Record<string, string[]>;
}
