/**
 * Flow Version Manager - A/B Testing and Version Control for Flows
 * 
 * This service manages multiple versions of flow definitions and enables:
 * - A/B testing different flow versions
 * - Gradual rollouts (canary deployments)
 * - Version rollback capabilities
 * - Analytics on version performance
 * 
 * Usage:
 * 1. Create multiple versions of a flow (e.g., auth_flow_v1, auth_flow_v2)
 * 2. Configure traffic split in version config
 * 3. Track performance metrics per version
 * 4. Roll out winner or rollback to stable version
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlowDefinition } from '../types/flow.types';
import { flowDefinitions } from '../flows';

// Version configuration for a flow
export interface FlowVersionConfig {
  // Unique version identifier
  versionId: string;
  
  // Reference to the flow definition
  flowId: string;
  
  // Traffic weight (0-100, percentage of traffic)
  weight: number;
  
  // Whether this version is enabled
  enabled: boolean;
  
  // Version metadata
  metadata: {
    createdAt: Date;
    createdBy: string;
    description: string;
    tags: string[];
  };
  
  // Rollout status
  rolloutStatus: 'stable' | 'canary' | 'testing' | 'deprecated';
}

// A/B test configuration
export interface ABTestConfig {
  // Test identifier
  testId: string;
  
  // Test name
  name: string;
  
  // Base flow being tested
  baseFlowId: string;
  
  // Versions being compared
  versions: FlowVersionConfig[];
  
  // Test configuration
  config: {
    startDate: Date;
    endDate?: Date;
    targetSampleSize?: number;
    primaryMetric: string;
    secondaryMetrics?: string[];
  };
  
  // Test status
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  
  // Results (updated as test runs)
  results?: ABTestResults;
}

// A/B test results
export interface ABTestResults {
  sampleSizes: Record<string, number>;
  conversionRates: Record<string, number>;
  completionRates: Record<string, number>;
  avgDuration: Record<string, number>;
  errorRates: Record<string, number>;
  winner?: string;
  confidence?: number;
  updatedAt: Date;
}

@Injectable()
export class FlowVersionManagerService implements OnModuleInit {
  private readonly logger = new Logger(FlowVersionManagerService.name);
  
  // Version registry: flowId -> versions
  private versionRegistry: Map<string, FlowVersionConfig[]> = new Map();
  
  // A/B test registry: testId -> config
  private abTestRegistry: Map<string, ABTestConfig> = new Map();
  
  // Session assignments: sessionId -> versionId (sticky sessions)
  private sessionAssignments: Map<string, string> = new Map();
  
  // Version metrics: versionId -> metrics
  private versionMetrics: Map<string, {
    starts: number;
    completions: number;
    errors: number;
    totalDuration: number;
  }> = new Map();
  
  constructor(private readonly configService: ConfigService) {}
  
  onModuleInit() {
    this.logger.log('🔄 Initializing Flow Version Manager...');
    this.initializeDefaultVersions();
    this.logger.log(`✅ Registered ${this.versionRegistry.size} flow version groups`);
  }
  
  /**
   * Initialize default versions from existing flow definitions
   */
  private initializeDefaultVersions(): void {
    for (const flow of flowDefinitions) {
      this.registerVersion(flow.id, {
        versionId: `${flow.id}_${flow.version || 'v1'}`,
        flowId: flow.id,
        weight: 100,
        enabled: true,
        metadata: {
          createdAt: new Date(),
          createdBy: 'system',
          description: `Default version for ${flow.name}`,
          tags: ['default', 'stable'],
        },
        rolloutStatus: 'stable',
      });
    }
  }
  
  /**
   * Register a new version for a flow
   */
  registerVersion(baseFlowId: string, config: FlowVersionConfig): void {
    const versions = this.versionRegistry.get(baseFlowId) || [];
    
    // Check for duplicate version
    const existing = versions.find(v => v.versionId === config.versionId);
    if (existing) {
      this.logger.warn(`Version ${config.versionId} already exists, updating...`);
      Object.assign(existing, config);
    } else {
      versions.push(config);
      this.logger.log(`📝 Registered version: ${config.versionId} for flow ${baseFlowId}`);
    }
    
    this.versionRegistry.set(baseFlowId, versions);
    
    // Initialize metrics
    if (!this.versionMetrics.has(config.versionId)) {
      this.versionMetrics.set(config.versionId, {
        starts: 0,
        completions: 0,
        errors: 0,
        totalDuration: 0,
      });
    }
  }
  
  /**
   * Get the flow version to use for a session
   * Implements weighted random selection with sticky sessions
   */
  selectVersion(baseFlowId: string, sessionId: string): FlowVersionConfig | null {
    // Check for sticky session assignment
    const stickyKey = `${baseFlowId}:${sessionId}`;
    const existingVersion = this.sessionAssignments.get(stickyKey);
    
    if (existingVersion) {
      const versions = this.versionRegistry.get(baseFlowId) || [];
      const assigned = versions.find(v => v.versionId === existingVersion);
      if (assigned && assigned.enabled) {
        return assigned;
      }
    }
    
    // Select new version based on weights
    const versions = this.versionRegistry.get(baseFlowId) || [];
    const enabledVersions = versions.filter(v => v.enabled);
    
    if (enabledVersions.length === 0) {
      this.logger.warn(`No enabled versions for flow ${baseFlowId}`);
      return null;
    }
    
    // Calculate total weight
    const totalWeight = enabledVersions.reduce((sum, v) => sum + v.weight, 0);
    
    // Random selection
    let random = Math.random() * totalWeight;
    let selected: FlowVersionConfig | null = null;
    
    for (const version of enabledVersions) {
      random -= version.weight;
      if (random <= 0) {
        selected = version;
        break;
      }
    }
    
    // Fallback to first version
    if (!selected) {
      selected = enabledVersions[0];
    }
    
    // Store sticky session
    this.sessionAssignments.set(stickyKey, selected.versionId);
    
    this.logger.debug(`🎲 Selected version ${selected.versionId} for session ${sessionId}`);
    
    return selected;
  }
  
  /**
   * Get the flow definition for a specific version
   */
  getFlowForVersion(versionConfig: FlowVersionConfig): FlowDefinition | null {
    // In a more complex setup, different versions might have different flow definitions
    // For now, we use the same flow definition but track versions
    return flowDefinitions.find(f => f.id === versionConfig.flowId) || null;
  }
  
  /**
   * Record flow start event
   */
  recordStart(versionId: string): void {
    const metrics = this.versionMetrics.get(versionId);
    if (metrics) {
      metrics.starts++;
    }
  }
  
  /**
   * Record flow completion event
   */
  recordCompletion(versionId: string, durationMs: number): void {
    const metrics = this.versionMetrics.get(versionId);
    if (metrics) {
      metrics.completions++;
      metrics.totalDuration += durationMs;
    }
  }
  
  /**
   * Record flow error event
   */
  recordError(versionId: string): void {
    const metrics = this.versionMetrics.get(versionId);
    if (metrics) {
      metrics.errors++;
    }
  }
  
  /**
   * Get metrics for a version
   */
  getVersionMetrics(versionId: string): {
    starts: number;
    completions: number;
    completionRate: number;
    errorRate: number;
    avgDuration: number;
  } | null {
    const metrics = this.versionMetrics.get(versionId);
    if (!metrics) return null;
    
    return {
      starts: metrics.starts,
      completions: metrics.completions,
      completionRate: metrics.starts > 0 ? metrics.completions / metrics.starts : 0,
      errorRate: metrics.starts > 0 ? metrics.errors / metrics.starts : 0,
      avgDuration: metrics.completions > 0 ? metrics.totalDuration / metrics.completions : 0,
    };
  }
  
  /**
   * Create a new A/B test
   */
  createABTest(config: Omit<ABTestConfig, 'status' | 'results'>): string {
    const testId = config.testId || `ab_test_${Date.now()}`;
    
    const fullConfig: ABTestConfig = {
      ...config,
      testId,
      status: 'draft',
    };
    
    this.abTestRegistry.set(testId, fullConfig);
    
    // Register all versions for the test
    for (const version of config.versions) {
      this.registerVersion(config.baseFlowId, version);
    }
    
    this.logger.log(`🧪 Created A/B test: ${testId} for flow ${config.baseFlowId}`);
    
    return testId;
  }
  
  /**
   * Start an A/B test
   */
  startABTest(testId: string): boolean {
    const test = this.abTestRegistry.get(testId);
    if (!test) {
      this.logger.error(`A/B test ${testId} not found`);
      return false;
    }
    
    if (test.status !== 'draft' && test.status !== 'paused') {
      this.logger.warn(`Cannot start test ${testId} with status ${test.status}`);
      return false;
    }
    
    // Enable all test versions
    for (const version of test.versions) {
      version.enabled = true;
    }
    
    test.status = 'running';
    test.config.startDate = new Date();
    
    this.logger.log(`🚀 Started A/B test: ${testId}`);
    
    return true;
  }
  
  /**
   * Stop an A/B test
   */
  stopABTest(testId: string, status: 'paused' | 'completed' | 'cancelled' = 'completed'): boolean {
    const test = this.abTestRegistry.get(testId);
    if (!test) {
      this.logger.error(`A/B test ${testId} not found`);
      return false;
    }
    
    test.status = status;
    test.config.endDate = new Date();
    
    // Calculate results
    const results: ABTestResults = {
      sampleSizes: {},
      conversionRates: {},
      completionRates: {},
      avgDuration: {},
      errorRates: {},
      updatedAt: new Date(),
    };
    
    for (const version of test.versions) {
      const metrics = this.getVersionMetrics(version.versionId);
      if (metrics) {
        results.sampleSizes[version.versionId] = metrics.starts;
        results.completionRates[version.versionId] = metrics.completionRate;
        results.errorRates[version.versionId] = metrics.errorRate;
        results.avgDuration[version.versionId] = metrics.avgDuration;
      }
    }
    
    // Simple winner detection (highest completion rate with sufficient sample)
    let winner: string | undefined;
    let bestRate = 0;
    
    for (const [versionId, rate] of Object.entries(results.completionRates)) {
      const sampleSize = results.sampleSizes[versionId] || 0;
      if (sampleSize >= 10 && rate > bestRate) { // Minimum 10 samples
        bestRate = rate;
        winner = versionId;
      }
    }
    
    results.winner = winner;
    test.results = results;
    
    this.logger.log(`🏁 Stopped A/B test ${testId}: status=${status}, winner=${winner || 'none'}`);
    
    return true;
  }
  
  /**
   * Get A/B test status and results
   */
  getABTestStatus(testId: string): ABTestConfig | null {
    return this.abTestRegistry.get(testId) || null;
  }
  
  /**
   * Promote a version to 100% traffic (winner)
   */
  promoteVersion(baseFlowId: string, winnerVersionId: string): boolean {
    const versions = this.versionRegistry.get(baseFlowId);
    if (!versions) {
      this.logger.error(`No versions found for flow ${baseFlowId}`);
      return false;
    }
    
    const winner = versions.find(v => v.versionId === winnerVersionId);
    if (!winner) {
      this.logger.error(`Version ${winnerVersionId} not found`);
      return false;
    }
    
    // Set winner to 100%, disable others
    for (const version of versions) {
      if (version.versionId === winnerVersionId) {
        version.weight = 100;
        version.enabled = true;
        version.rolloutStatus = 'stable';
      } else {
        version.weight = 0;
        version.enabled = false;
        version.rolloutStatus = 'deprecated';
      }
    }
    
    // Clear sticky sessions to apply new weights
    for (const [key, value] of this.sessionAssignments) {
      if (key.startsWith(`${baseFlowId}:`)) {
        this.sessionAssignments.delete(key);
      }
    }
    
    this.logger.log(`🏆 Promoted version ${winnerVersionId} to 100% for flow ${baseFlowId}`);
    
    return true;
  }
  
  /**
   * Get all versions for a flow
   */
  getVersions(baseFlowId: string): FlowVersionConfig[] {
    return this.versionRegistry.get(baseFlowId) || [];
  }
  
  /**
   * Get all A/B tests
   */
  getAllABTests(): ABTestConfig[] {
    return Array.from(this.abTestRegistry.values());
  }
  
  /**
   * Update version weights for canary deployment
   */
  setCanaryWeights(baseFlowId: string, stableVersionId: string, canaryVersionId: string, canaryPercent: number): boolean {
    const versions = this.versionRegistry.get(baseFlowId);
    if (!versions) return false;
    
    const stable = versions.find(v => v.versionId === stableVersionId);
    const canary = versions.find(v => v.versionId === canaryVersionId);
    
    if (!stable || !canary) return false;
    
    stable.weight = 100 - canaryPercent;
    stable.rolloutStatus = 'stable';
    stable.enabled = true;
    
    canary.weight = canaryPercent;
    canary.rolloutStatus = 'canary';
    canary.enabled = true;
    
    this.logger.log(`🐤 Set canary weights: ${stableVersionId}=${100 - canaryPercent}%, ${canaryVersionId}=${canaryPercent}%`);
    
    return true;
  }
}
