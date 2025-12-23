import { Module, forwardRef } from '@nestjs/common';
import { FlowEngineService } from './flow-engine.service';
import { FlowContextService } from './flow-context.service';
import { StateMachineEngine } from './state-machine.engine';
import { ExecutorRegistryService } from './executor-registry.service';
// Type alias for cleaner imports
const ExecutorRegistry = ExecutorRegistryService;

// Executors
import { LlmExecutor } from './executors/llm.executor';
import { NluExecutor } from './executors/nlu.executor';
import { SearchExecutor } from './executors/search.executor';
import { AddressExecutor } from './executors/address.executor';
import { DistanceExecutor } from './executors/distance.executor';
import { ZoneExecutor } from './executors/zone.executor';
import { PricingExecutor } from './executors/pricing.executor';
import { OrderExecutor } from './executors/order.executor';
import { ResponseExecutor } from './executors/response.executor';
import { GameExecutor } from './executors/game.executor';
import { ParcelExecutor } from './executors/parcel.executor';
import { PreferenceExecutor } from './executors/preference.executor';
import { AuthExecutor } from './executors/auth.executor';
import { PhpApiExecutor } from './executors/php-api.executor';
import { SessionExecutor } from './executors/session.executor';
import { InventoryExecutor } from './executors/inventory.executor';
import { ExternalSearchExecutor } from './executors/external-search.executor';
import { SelectionExecutor } from './executors/selection.executor';
import { ComplexOrderParserExecutor } from './executors/complex-order-parser.executor';
import { GroupOrderSearchExecutor } from './executors/group-order-search.executor';
import { ValuePropositionExecutor } from './executors/value-proposition.executor';
// Game executors disabled - Prisma schema mismatch
// import { GameScorerExecutor } from './executors/game-scorer.executor';
// import { RewardPointsExecutor } from './executors/reward-points.executor';
import { FlowInitializerService } from './services/flow-initializer.service';
import { YamlFlowLoaderService } from './services/yaml-flow-loader.service';
import { YamlV2FlowLoaderService } from './services/yaml-v2-flow-loader.service';
import { FlowVersionManagerService } from './services/flow-version-manager.service';
import { FlowBuilderController } from './controllers/flow-builder.controller';
import { FlowsController } from './flows.controller';

// Dependencies
import { DatabaseModule } from '../database/database.module';
import { SessionModule } from '../session/session.module';
import { LlmModule } from '../llm/llm.module';
import { NluModule } from '../nlu/nlu.module';
import { SearchModule } from '../search/search.module';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { AgentsModule } from '../agents/agents.module';
import { GamificationModule } from '../gamification/gamification.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { OrderModule } from '../order/order.module';
import { PricingModule } from '../pricing/pricing.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [
    DatabaseModule,
    SessionModule,
    LlmModule,
    NluModule,
    SearchModule,
    PhpIntegrationModule,
    GamificationModule,
    PersonalizationModule,
    OrderModule,
    PricingModule,
    ProfilesModule,
    forwardRef(() => AgentsModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [FlowBuilderController, FlowsController],
  providers: [
    // Core services
    FlowEngineService,
    FlowContextService,
    StateMachineEngine,
    ExecutorRegistryService,
    FlowInitializerService, // Auto-load flows on startup
    YamlFlowLoaderService, // Load flows from YAML files
    YamlV2FlowLoaderService, // Load YAML V2 flows (vendor/driver)
    FlowVersionManagerService, // A/B testing and version control

    // Executors
    LlmExecutor,
    NluExecutor,
    SearchExecutor,
    AddressExecutor,
    DistanceExecutor,
    ZoneExecutor,
    PricingExecutor,
    OrderExecutor,
    ResponseExecutor,
    GameExecutor,
    ParcelExecutor,
    PreferenceExecutor,
    AuthExecutor,
    PhpApiExecutor,
    SessionExecutor,
    InventoryExecutor,
    ExternalSearchExecutor,
    SelectionExecutor,
    ComplexOrderParserExecutor,
    GroupOrderSearchExecutor,
    ValuePropositionExecutor,
    // GameScorerExecutor, // Disabled - Prisma schema mismatch
    // RewardPointsExecutor, // Disabled - Prisma schema mismatch
  ],
  exports: [
    FlowEngineService,
    FlowContextService,
    ExecutorRegistryService,
    YamlFlowLoaderService,
    YamlV2FlowLoaderService,
    FlowVersionManagerService,
  ],
})
export class FlowEngineModule {
  constructor(
    private readonly executorRegistry: ExecutorRegistryService,
    // Inject all executors
    private readonly llmExecutor: LlmExecutor,
    private readonly nluExecutor: NluExecutor,
    private readonly searchExecutor: SearchExecutor,
    private readonly addressExecutor: AddressExecutor,
    private readonly distanceExecutor: DistanceExecutor,
    private readonly zoneExecutor: ZoneExecutor,
    private readonly pricingExecutor: PricingExecutor,
    private readonly orderExecutor: OrderExecutor,
    private readonly responseExecutor: ResponseExecutor,
    private readonly gameExecutor: GameExecutor,
    private readonly parcelExecutor: ParcelExecutor,
    private readonly preferenceExecutor: PreferenceExecutor,
    private readonly authExecutor: AuthExecutor,
    private readonly phpApiExecutor: PhpApiExecutor,
    private readonly sessionExecutor: SessionExecutor,
    private readonly inventoryExecutor: InventoryExecutor,
    private readonly externalSearchExecutor: ExternalSearchExecutor,
    private readonly selectionExecutor: SelectionExecutor,
    private readonly complexOrderParserExecutor: ComplexOrderParserExecutor,
    private readonly groupOrderSearchExecutor: GroupOrderSearchExecutor,
    private readonly valuePropositionExecutor: ValuePropositionExecutor,
    // private readonly gameScorerExecutor: GameScorerExecutor, // Disabled
    // private readonly rewardPointsExecutor: RewardPointsExecutor, // Disabled
  ) {
    // Register all executors
    this.executorRegistry.register(llmExecutor);
    this.executorRegistry.register(nluExecutor);
    this.executorRegistry.register(searchExecutor);
    this.executorRegistry.register(addressExecutor);
    this.executorRegistry.register(distanceExecutor);
    this.executorRegistry.register(zoneExecutor);
    this.executorRegistry.register(pricingExecutor);
    this.executorRegistry.register(orderExecutor);
    this.executorRegistry.register(responseExecutor);
    this.executorRegistry.register(gameExecutor);
    this.executorRegistry.register(parcelExecutor);
    this.executorRegistry.register(preferenceExecutor);
    this.executorRegistry.register(authExecutor);
    this.executorRegistry.register(phpApiExecutor);
    this.executorRegistry.register(sessionExecutor);
    this.executorRegistry.register(inventoryExecutor);
    this.executorRegistry.register(externalSearchExecutor);
    this.executorRegistry.register(selectionExecutor);
    this.executorRegistry.register(complexOrderParserExecutor);
    this.executorRegistry.register(groupOrderSearchExecutor);
    this.executorRegistry.register(valuePropositionExecutor);
    // this.executorRegistry.register(gameScorerExecutor); // Disabled
    // this.executorRegistry.register(rewardPointsExecutor); // Disabled
  }
}
