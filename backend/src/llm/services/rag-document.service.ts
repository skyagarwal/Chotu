import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

/**
 * Document types supported for RAG ingestion
 */
export type DocumentType = 'pdf' | 'txt' | 'md' | 'html' | 'json' | 'csv';

/**
 * Document metadata
 */
export interface DocumentMetadata {
  title: string;
  source: string;
  category?: string;
  tags?: string[];
  tenantId?: string;
  language?: string;
  createdAt?: Date;
  author?: string;
}

/**
 * Document chunk for vector storage
 */
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
  metadata: DocumentMetadata & {
    startChar?: number;
    endChar?: number;
  };
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  documentId: string;
  chunksCreated: number;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
  processingTimeMs: number;
}

/**
 * RAG Document Service
 * 
 * Handles document ingestion for RAG:
 * - Parses documents (PDF, TXT, MD, etc.)
 * - Chunks content for optimal retrieval
 * - Generates embeddings
 * - Stores in OpenSearch for vector search
 */
@Injectable()
export class RagDocumentService {
  private readonly logger = new Logger(RagDocumentService.name);
  private readonly opensearchUrl: string;
  private readonly indexName = 'rag_documents';
  
  // Chunking configuration
  private readonly chunkSize = 500; // ~500 characters per chunk
  private readonly chunkOverlap = 100; // 100 char overlap for context continuity

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.opensearchUrl = this.configService.get('OPENSEARCH_URL', 'http://localhost:9200');
    this.logger.log(`📚 RAG Document Service initialized`);
    this.initializeIndex();
  }

  /**
   * Initialize OpenSearch index for RAG documents
   */
  private async initializeIndex(): Promise<void> {
    try {
      // Check if index exists
      const response = await firstValueFrom(
        this.httpService.head(`${this.opensearchUrl}/${this.indexName}`, {
          validateStatus: (status) => status === 200 || status === 404,
        })
      );

      if (response.status === 404) {
        // Create index
        await firstValueFrom(
          this.httpService.put(`${this.opensearchUrl}/${this.indexName}`, {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              'index.knn': true,
            },
            mappings: {
              properties: {
                document_id: { type: 'keyword' },
                content: { type: 'text', analyzer: 'standard' },
                chunk_index: { type: 'integer' },
                title: { type: 'text' },
                source: { type: 'keyword' },
                category: { type: 'keyword' },
                tags: { type: 'keyword' },
                tenant_id: { type: 'keyword' },
                language: { type: 'keyword' },
                created_at: { type: 'date' },
                embedding_768: {
                  type: 'knn_vector',
                  dimension: 768,
                  method: {
                    name: 'hnsw',
                    space_type: 'cosinesimil',
                    engine: 'nmslib',
                  },
                },
              },
            },
          })
        );
        this.logger.log(`✅ Created RAG documents index: ${this.indexName}`);
      }
    } catch (error) {
      this.logger.warn(`Index initialization failed: ${error.message}`);
    }
  }

  /**
   * Ingest a text document into the RAG system
   */
  async ingestText(
    content: string,
    metadata: DocumentMetadata,
    embeddingService?: any
  ): Promise<IngestionResult> {
    const startTime = Date.now();
    const documentId = crypto.randomUUID();
    const errors: string[] = [];
    
    try {
      // 1. Chunk the content
      const chunks = this.chunkText(content, documentId, metadata);
      this.logger.log(`📄 Document chunked: ${chunks.length} chunks from "${metadata.title}"`);
      
      // 2. Generate embeddings for each chunk
      if (embeddingService) {
        for (const chunk of chunks) {
          try {
            const result = await embeddingService.embed(chunk.content);
            chunk.embedding = result.embedding;
          } catch (err) {
            errors.push(`Chunk ${chunk.chunkIndex}: embedding failed`);
            this.logger.warn(`Failed to embed chunk ${chunk.chunkIndex}: ${err.message}`);
          }
        }
      }
      
      // 3. Index chunks to OpenSearch
      let indexed = 0;
      for (const chunk of chunks) {
        try {
          const doc = {
            document_id: chunk.documentId,
            content: chunk.content,
            chunk_index: chunk.chunkIndex,
            title: chunk.metadata.title,
            source: chunk.metadata.source,
            category: chunk.metadata.category,
            tags: chunk.metadata.tags,
            tenant_id: chunk.metadata.tenantId,
            language: chunk.metadata.language,
            created_at: chunk.metadata.createdAt || new Date(),
            ...(chunk.embedding && { embedding_768: chunk.embedding }),
          };

          await firstValueFrom(
            this.httpService.post(`${this.opensearchUrl}/${this.indexName}/_doc`, doc, {
              timeout: 10000,
            })
          );
          indexed++;
        } catch (err) {
          errors.push(`Chunk ${chunk.chunkIndex}: indexing failed`);
          this.logger.warn(`Failed to index chunk ${chunk.chunkIndex}: ${err.message}`);
        }
      }

      return {
        documentId,
        chunksCreated: indexed,
        status: indexed === chunks.length ? 'success' : indexed > 0 ? 'partial' : 'failed',
        errors: errors.length > 0 ? errors : undefined,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Document ingestion failed: ${error.message}`);
      return {
        documentId,
        chunksCreated: 0,
        status: 'failed',
        errors: [error.message],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Ingest a file (supports txt, md, json)
   */
  async ingestFile(
    fileContent: Buffer | string,
    filename: string,
    metadata: Partial<DocumentMetadata>,
    embeddingService?: any
  ): Promise<IngestionResult> {
    const ext = filename.split('.').pop()?.toLowerCase() as DocumentType;
    let content: string;
    
    // Convert buffer to string
    const textContent = Buffer.isBuffer(fileContent) 
      ? fileContent.toString('utf-8') 
      : fileContent;

    switch (ext) {
      case 'txt':
      case 'md':
        content = textContent;
        break;
      
      case 'json':
        try {
          const json = JSON.parse(textContent);
          content = this.flattenJson(json);
        } catch {
          content = textContent;
        }
        break;
      
      case 'csv':
        content = this.parseCsv(textContent);
        break;
      
      case 'html':
        content = this.stripHtml(textContent);
        break;
      
      default:
        content = textContent;
    }

    return this.ingestText(content, {
      title: metadata.title || filename,
      source: metadata.source || `file:${filename}`,
      category: metadata.category,
      tags: metadata.tags,
      tenantId: metadata.tenantId,
      language: metadata.language || 'auto',
      createdAt: new Date(),
      author: metadata.author,
    }, embeddingService);
  }

  /**
   * Search RAG documents
   */
  async search(
    query: string,
    options: {
      tenantId?: string;
      category?: string;
      limit?: number;
      minScore?: number;
      embedding?: number[];
    } = {}
  ): Promise<DocumentChunk[]> {
    const { tenantId, category, limit = 5, minScore = 0.7, embedding } = options;

    try {
      // Build query
      const filters: any[] = [];
      if (tenantId) filters.push({ term: { tenant_id: tenantId } });
      if (category) filters.push({ term: { category } });

      const searchQuery: any = {
        size: limit,
        query: embedding
          ? {
              bool: {
                filter: filters.length > 0 ? filters : undefined,
                must: {
                  knn: {
                    embedding_768: {
                      vector: embedding,
                      k: limit,
                    },
                  },
                },
              },
            }
          : {
              bool: {
                filter: filters.length > 0 ? filters : undefined,
                must: {
                  multi_match: {
                    query,
                    fields: ['content^2', 'title'],
                    type: 'best_fields',
                  },
                },
              },
            },
        _source: true,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.opensearchUrl}/${this.indexName}/_search`,
          searchQuery,
          { timeout: 10000 }
        )
      );

      const hits = response.data?.hits?.hits || [];
      
      return hits
        .filter((hit: any) => hit._score >= minScore)
        .map((hit: any) => ({
          id: hit._id,
          documentId: hit._source.document_id,
          content: hit._source.content,
          chunkIndex: hit._source.chunk_index,
          metadata: {
            title: hit._source.title,
            source: hit._source.source,
            category: hit._source.category,
            tags: hit._source.tags,
            tenantId: hit._source.tenant_id,
            language: hit._source.language,
            createdAt: new Date(hit._source.created_at),
          },
        }));
    } catch (error) {
      this.logger.error(`RAG search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Build context from search results for LLM
   */
  buildContext(chunks: DocumentChunk[]): string {
    if (chunks.length === 0) return '';

    const contextParts = chunks.map((chunk, i) => {
      return `[Source ${i + 1}: ${chunk.metadata.title}]\n${chunk.content}`;
    });

    return `## Reference Documents\n\n${contextParts.join('\n\n---\n\n')}\n\n`;
  }

  /**
   * Get document statistics
   */
  async getStats(tenantId?: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    categories: string[];
  }> {
    try {
      const query: any = tenantId
        ? { query: { term: { tenant_id: tenantId } } }
        : { query: { match_all: {} } };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.opensearchUrl}/${this.indexName}/_search`,
          {
            ...query,
            size: 0,
            aggs: {
              unique_docs: { cardinality: { field: 'document_id' } },
              categories: { terms: { field: 'category', size: 100 } },
            },
          },
          { timeout: 10000 }
        )
      );

      return {
        totalDocuments: response.data?.aggregations?.unique_docs?.value || 0,
        totalChunks: response.data?.hits?.total?.value || 0,
        categories: response.data?.aggregations?.categories?.buckets?.map((b: any) => b.key) || [],
      };
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      return { totalDocuments: 0, totalChunks: 0, categories: [] };
    }
  }

  /**
   * Delete a document and all its chunks
   */
  async deleteDocument(documentId: string): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.opensearchUrl}/${this.indexName}/_delete_by_query`,
          {
            query: { term: { document_id: documentId } },
          },
          { timeout: 30000 }
        )
      );

      const deleted = response.data?.deleted || 0;
      this.logger.log(`🗑️ Deleted document ${documentId}: ${deleted} chunks`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete document: ${error.message}`);
      return 0;
    }
  }

  /**
   * Chunk text into overlapping segments
   */
  private chunkText(text: string, documentId: string, metadata: DocumentMetadata): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    // Normalize whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();

    while (startIndex < cleanText.length) {
      // Calculate end index
      let endIndex = Math.min(startIndex + this.chunkSize, cleanText.length);
      
      // Try to break at sentence boundary
      if (endIndex < cleanText.length) {
        const lastPeriod = cleanText.lastIndexOf('.', endIndex);
        const lastQuestion = cleanText.lastIndexOf('?', endIndex);
        const lastExclaim = cleanText.lastIndexOf('!', endIndex);
        
        const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclaim);
        
        // Only use sentence boundary if it's reasonably close
        if (lastSentence > startIndex + this.chunkSize * 0.5) {
          endIndex = lastSentence + 1;
        }
      }

      const content = cleanText.substring(startIndex, endIndex).trim();
      
      if (content.length > 0) {
        chunks.push({
          id: `${documentId}_${chunkIndex}`,
          documentId,
          content,
          chunkIndex,
          metadata: {
            ...metadata,
            startChar: startIndex,
            endChar: endIndex,
          },
        });
        chunkIndex++;
      }

      // Move to next chunk with overlap
      startIndex = endIndex - this.chunkOverlap;
      
      // Ensure progress
      if (startIndex <= chunks[chunks.length - 1]?.metadata.startChar) {
        startIndex = endIndex;
      }
    }

    return chunks;
  }

  /**
   * Flatten JSON to searchable text
   */
  private flattenJson(obj: any, prefix = ''): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        lines.push(this.flattenJson(value, path));
      } else {
        lines.push(`${path}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Parse CSV to text
   */
  private parseCsv(csv: string): string {
    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length === 0) return '';

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.map((h, i) => `${h}: ${values[i]?.trim() || ''}`).join(', ');
    });

    return rows.join('\n');
  }

  /**
   * Strip HTML tags
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
