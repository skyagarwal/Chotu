import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SearchController } from './controllers/search.controller';
import { SearchAnalyticsController } from './controllers/analytics.controller';
import { SearchService } from './services/search.service';
import { SearchAnalyticsService } from './services/search-analytics.service';
import { OpenSearchService } from './services/opensearch.service';
import { EmbeddingService } from './services/embedding.service';
import { UnifiedEmbeddingService } from './services/unified-embedding.service';
import { ModuleService } from './services/module.service';
import { ExternalVendorService } from './services/external-vendor.service';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { NluModule } from '../nlu/nlu.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 3,
    }),
    PhpIntegrationModule,
    forwardRef(() => NluModule), // For UnifiedEmbeddingService using IndicBERT
  ],
  controllers: [SearchController, SearchAnalyticsController],
  providers: [
    SearchService,
    SearchAnalyticsService,
    OpenSearchService,
    EmbeddingService,
    UnifiedEmbeddingService,
    ModuleService,
    ExternalVendorService,
  ],
  exports: [
    SearchService,
    SearchAnalyticsService,
    OpenSearchService,
    EmbeddingService,
    UnifiedEmbeddingService,
    ModuleService,
    ExternalVendorService,
  ],
})
export class SearchModule {}
