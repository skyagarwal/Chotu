/**
 * Pricing Module
 * 
 * Handles pricing intelligence:
 * - Value proposition calculation (Mangwale vs competitors)
 * - Dynamic pricing analysis
 * - Savings calculation
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ValuePropositionService } from './services/value-proposition.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
  ],
  providers: [
    ValuePropositionService,
  ],
  exports: [
    ValuePropositionService,
  ],
})
export class PricingModule {}
