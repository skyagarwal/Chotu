import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RagDocumentService, DocumentMetadata } from '../services/rag-document.service';
import { UnifiedEmbeddingService } from '../../search/services/unified-embedding.service';

/**
 * RAG Document Controller
 * 
 * Endpoints for uploading and managing documents for RAG.
 */
@Controller('rag/documents')
export class RagDocumentController {
  private readonly logger = new Logger(RagDocumentController.name);

  constructor(
    private readonly ragDocService: RagDocumentService,
    private readonly embeddingService: UnifiedEmbeddingService,
  ) {}

  /**
   * Get RAG document statistics
   */
  @Get('stats')
  async getStats(@Query('tenantId') tenantId?: string) {
    const stats = await this.ragDocService.getStats(tenantId);
    return {
      success: true,
      stats,
    };
  }

  /**
   * Ingest text content directly
   */
  @Post('ingest/text')
  async ingestText(
    @Body() body: {
      content: string;
      title: string;
      source?: string;
      category?: string;
      tags?: string[];
      tenantId?: string;
      language?: string;
    }
  ) {
    if (!body.content || !body.title) {
      throw new BadRequestException('content and title are required');
    }

    const metadata: DocumentMetadata = {
      title: body.title,
      source: body.source || 'api-upload',
      category: body.category,
      tags: body.tags,
      tenantId: body.tenantId,
      language: body.language,
      createdAt: new Date(),
    };

    const result = await this.ragDocService.ingestText(
      body.content,
      metadata,
      this.embeddingService
    );

    this.logger.log(`📄 Text ingested: ${body.title} → ${result.chunksCreated} chunks`);

    return {
      success: result.status !== 'failed',
      ...result,
    };
  }

  /**
   * Upload a file for RAG ingestion
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      title?: string;
      source?: string;
      category?: string;
      tags?: string;
      tenantId?: string;
      language?: string;
    }
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Parse tags from comma-separated string
    const tags = body.tags ? body.tags.split(',').map(t => t.trim()) : undefined;

    const result = await this.ragDocService.ingestFile(
      file.buffer,
      file.originalname,
      {
        title: body.title,
        source: body.source,
        category: body.category,
        tags,
        tenantId: body.tenantId,
        language: body.language,
      },
      this.embeddingService
    );

    this.logger.log(`📁 File uploaded: ${file.originalname} → ${result.chunksCreated} chunks`);

    return {
      success: result.status !== 'failed',
      filename: file.originalname,
      fileSize: file.size,
      ...result,
    };
  }

  /**
   * Search RAG documents
   */
  @Post('search')
  async search(
    @Body() body: {
      query: string;
      tenantId?: string;
      category?: string;
      limit?: number;
      minScore?: number;
      useEmbedding?: boolean;
    }
  ) {
    if (!body.query) {
      throw new BadRequestException('query is required');
    }

    let embedding: number[] | undefined;
    
    // Generate embedding for semantic search if requested
    if (body.useEmbedding !== false) {
      try {
        const embResult = await this.embeddingService.embed(body.query);
        embedding = embResult.embedding;
      } catch (error) {
        this.logger.warn(`Embedding failed, falling back to keyword search: ${error.message}`);
      }
    }

    const chunks = await this.ragDocService.search(body.query, {
      tenantId: body.tenantId,
      category: body.category,
      limit: body.limit,
      minScore: body.minScore,
      embedding,
    });

    return {
      success: true,
      count: chunks.length,
      chunks,
      context: this.ragDocService.buildContext(chunks),
    };
  }

  /**
   * Delete a document
   */
  @Delete(':documentId')
  async deleteDocument(@Param('documentId') documentId: string) {
    const deleted = await this.ragDocService.deleteDocument(documentId);
    
    return {
      success: deleted > 0,
      deleted,
      message: `Deleted ${deleted} chunks for document ${documentId}`,
    };
  }

  /**
   * Ingest from URL (fetch and process)
   */
  @Post('ingest/url')
  async ingestFromUrl(
    @Body() body: {
      url: string;
      title?: string;
      category?: string;
      tags?: string[];
      tenantId?: string;
    }
  ) {
    if (!body.url) {
      throw new BadRequestException('url is required');
    }

    // Note: URL fetching should use HttpService in production
    // This is a placeholder for the functionality
    return {
      success: false,
      message: 'URL ingestion not yet implemented. Please use file upload or text ingestion.',
    };
  }
}
