import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmController } from './controllers/llm.controller';
import { FailoverStatusController } from './controllers/failover-status.controller';
import { LlmService } from './services/llm.service';
import { VllmService } from './services/vllm.service';
import { CloudLlmService } from './services/cloud-llm.service';
import { PromptTemplateService } from './services/prompt-template.service';
import { ModelRegistryService } from './services/model-registry.service';
import { LlmUsageTrackingService } from './services/llm-usage-tracking.service';
import { RagService } from './services/rag.service';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60s for LLM generation
      maxRedirects: 3,
      httpAgent: require('http').Agent({ keepAlive: false }), // Fix 404 errors on connection reuse
      httpsAgent: require('https').Agent({ keepAlive: false }),
    }),
    forwardRef(() => SearchModule), // For RAG service
  ],
  controllers: [LlmController, FailoverStatusController],
  providers: [
    LlmService,
    VllmService,
    CloudLlmService,
    PromptTemplateService,
    ModelRegistryService,
    LlmUsageTrackingService,
    RagService,
  ],
  exports: [
    LlmService, 
    PromptTemplateService, 
    ModelRegistryService, 
    LlmUsageTrackingService,
    RagService,
  ],
})
export class LlmModule {}
