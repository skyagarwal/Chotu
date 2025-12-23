import { Module } from '@nestjs/common';
import { SearchOrchestrator } from './search.orchestrator';

/**
 * Orchestrator Module
 * 
 * Provides intelligent routing between OpenSearch and PHP APIs
 * based on intent classification and query type.
 */
@Module({
  providers: [SearchOrchestrator],
  exports: [SearchOrchestrator],
})
export class OrchestratorModule {}
