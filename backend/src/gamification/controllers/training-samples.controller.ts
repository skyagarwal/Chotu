import { Controller, Get, Post, Param, Query, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { TrainingSampleService } from '../services/training-sample.service';
import { ApproveRejectDto, TrainingSampleFilters, ExportFormat } from '../dto';

/**
 * Training Samples Controller
 * 
 * Endpoints:
 * - GET /api/gamification/training-samples - List samples with filters
 * - GET /api/gamification/training-samples/stats - Get statistics
 * - POST /api/gamification/training-samples/:id/approve - Approve sample
 * - POST /api/gamification/training-samples/:id/reject - Reject sample
 * - GET /api/gamification/training-samples/export - Export approved samples
 */
@Controller('gamification/training-samples')
export class TrainingSamplesController {
  private readonly logger = new Logger(TrainingSamplesController.name);

  constructor(
    private readonly trainingSampleService: TrainingSampleService,
  ) {}

  /**
   * GET /api/gamification/training-samples/stats
   * Returns statistics about training samples
   */
  @Get('stats')
  async getStats() {
    try {
      this.logger.log('Fetching training samples statistics');
      
      const stats = await this.trainingSampleService.getTrainingSampleStats();

      return {
        success: true,
        data: stats,
        meta: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch stats: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch statistics',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/gamification/training-samples
   * Returns filtered list of training samples
   * 
   * Query params:
   * - status: 'all' | 'pending' | 'approved' | 'rejected'
   * - search: text search in message
   * - limit: max results (default: 50)
   * - offset: pagination offset (default: 0)
   */
  @Get()
  async getTrainingSamples(@Query() filters: TrainingSampleFilters) {
    try {
      const {
        status = 'all',
        search = '',
        limit = 50,
        offset = 0,
      } = filters;

      this.logger.log(`Fetching training samples: status=${status}, search="${search}", limit=${limit}, offset=${offset}`);

      // Build where clause based on filters
      const where: any = {};
      
      if (status === 'pending') {
        where.reviewStatus = 'pending';
      } else if (status === 'approved') {
        where.reviewStatus = 'approved';
      } else if (status === 'rejected') {
        where.reviewStatus = 'rejected';
      }

      if (search) {
        where.OR = [
          { text: { contains: search, mode: 'insensitive' } },
          { intent: { contains: search, mode: 'insensitive' } },
        ];
      }

      const samples = await this.trainingSampleService['prisma'].trainingSample.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      });

      const total = await this.trainingSampleService['prisma'].trainingSample.count({
        where,
      });

      return {
        success: true,
        data: samples,
        meta: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + samples.length,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch training samples: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch training samples',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/gamification/training-samples/:id/approve
   * Approve a training sample
   * 
   * Body: { approved_by: string, reason?: string }
   */
  @Post(':id/approve')
  async approveSample(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    try {
      this.logger.log(`Approving training sample ${id} by ${dto.approved_by}`);
      
      const sample = await this.trainingSampleService.approveSample(
        parseInt(id),
        dto.approved_by,
      );

      return {
        success: true,
        data: sample,
        message: 'Training sample approved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to approve sample ${id}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to approve sample',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/gamification/training-samples/:id/reject
   * Reject a training sample
   * 
   * Body: { approved_by: string, reason?: string }
   */
  @Post(':id/reject')
  async rejectSample(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    try {
      this.logger.log(`Rejecting training sample ${id} by ${dto.approved_by}`);
      
      const sample = await this.trainingSampleService.rejectSample(
        parseInt(id),
        dto.approved_by,
      );

      return {
        success: true,
        data: sample,
        message: 'Training sample rejected successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to reject sample ${id}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to reject sample',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/gamification/training-samples/export
   * Export approved training samples in specified format
   * 
   * Query params:
   * - format: 'json' | 'jsonl' | 'csv' (default: jsonl)
   */
  @Get('export')
  async exportSamples(@Query() query: ExportFormat) {
    try {
      const format = query.format || 'jsonl';
      this.logger.log(`Exporting training samples in ${format} format`);
      
      const samples = await this.trainingSampleService.getApprovedSamples();

      if (format === 'jsonl') {
        // JSONL format for IndicBERT training
        const jsonl = samples
          .map(s => JSON.stringify({
            text: s.text,
            intent: s.intent,
            entities: s.entities,
            language: s.language,
            tone: s.tone,
            confidence: s.confidence,
          }))
          .join('\n');

        return {
          success: true,
          data: jsonl,
          meta: {
            format: 'jsonl',
            count: samples.length,
            timestamp: new Date(),
          },
        };
      } else if (format === 'csv') {
        // CSV format
        const headers = 'text,intent,language,tone,confidence\n';
        const rows = samples
          .map(s => `"${s.text}","${s.intent}","${s.language}","${s.tone}",${s.confidence}`)
          .join('\n');

        return {
          success: true,
          data: headers + rows,
          meta: {
            format: 'csv',
            count: samples.length,
            timestamp: new Date(),
          },
        };
      } else {
        // JSON format (default)
        return {
          success: true,
          data: samples,
          meta: {
            format: 'json',
            count: samples.length,
            timestamp: new Date(),
          },
        };
      }
    } catch (error) {
      this.logger.error(`Failed to export samples: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to export samples',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
