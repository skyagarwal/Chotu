import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FlowManagementController } from './controllers/flow-management.controller';
import { FlowManagementService } from './services/flow-management.service';
import { FlowBuilderService } from './services/flow-builder.service';
import { FlowExecutorService } from './services/flow-executor.service';
import { FlowValidationService } from './services/flow-validation.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  controllers: [], // FlowManagementController disabled - using FlowsController in flow-engine module instead
  providers: [
    FlowManagementService,
    FlowBuilderService,
    FlowExecutorService,
    FlowValidationService,
  ],
  exports: [
    FlowManagementService,
    FlowBuilderService,
    FlowExecutorService,
  ],
})
export class FlowManagementModule {}
