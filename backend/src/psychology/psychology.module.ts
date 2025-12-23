import { Module } from '@nestjs/common';
import { PersuasionEngineService } from './services/persuasion-engine.service';
import { UrgencyTriggerService } from './services/urgency-trigger.service';
import { SocialProofService } from './services/social-proof.service';
import { PsychologyOrchestratorService } from './services/psychology-orchestrator.service';
import { PersonalizationModule } from '../personalization/personalization.module';

/**
 * Psychology Module
 * 
 * Applies behavioral psychology principles to increase conversion:
 * 
 * 1. Persuasion Engine - Cialdini's 6 principles adapted for commerce
 *    - Reciprocity: Offer value first (free samples, tips)
 *    - Commitment: Small yeses lead to bigger ones
 *    - Social Proof: "500 people ordered this today"
 *    - Authority: Expert recommendations, certifications
 *    - Liking: Personalized, friendly tone
 *    - Scarcity: Limited stock, time-bound offers
 * 
 * 2. Urgency Triggers - Create FOMO without being pushy
 *    - Stock levels: "Only 3 left!"
 *    - Time-based: "Order in 15 min for today's delivery"
 *    - Demand signals: "12 people viewing this now"
 * 
 * 3. Social Proof - Build trust through community
 *    - Recent orders: "Rahul from Indore just ordered this"
 *    - Ratings/reviews: "4.8★ from 234 reviews"
 *    - Trending: "Trending in your area"
 * 
 * 4. Orchestrator - Combines signals based on user psychology profile
 *    - Matches triggers to user's decision-making style
 *    - Avoids over-triggering (fatigue prevention)
 *    - A/B tests different approaches
 */
@Module({
  imports: [PersonalizationModule],
  providers: [
    PersuasionEngineService,
    UrgencyTriggerService,
    SocialProofService,
    PsychologyOrchestratorService,
  ],
  exports: [
    PersuasionEngineService,
    UrgencyTriggerService,
    SocialProofService,
    PsychologyOrchestratorService,
  ],
})
export class PsychologyModule {}
