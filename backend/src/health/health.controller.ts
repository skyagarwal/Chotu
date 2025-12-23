import { Controller, Get } from '@nestjs/common';
import { PhpApiService } from '../php-integration/services/php-api.service';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from '../session/session.service';

@Controller('health')
export class HealthController {
  // Cache PHP health status to avoid blocking health endpoint
  private phpHealthCache: { connected: boolean; latency: number; error?: string; lastCheck: number } = {
    connected: false,
    latency: 0,
    error: 'Not checked yet',
    lastCheck: 0
  };
  private phpHealthCheckInProgress = false;

  constructor(
    private readonly phpApiService: PhpApiService,
    private readonly prismaService: PrismaService,
    private readonly sessionService: SessionService,
  ) {
    // Start background PHP health check
    this.checkPhpHealthBackground();
  }

  /**
   * Background PHP health check - non-blocking
   */
  private async checkPhpHealthBackground() {
    if (this.phpHealthCheckInProgress) return;
    
    this.phpHealthCheckInProgress = true;
    try {
      const phpHealth = await this.phpApiService.checkConnection();
      this.phpHealthCache = {
        ...phpHealth,
        lastCheck: Date.now()
      };
    } catch (e) {
      this.phpHealthCache = {
        connected: false,
        latency: 0,
        error: e.message || 'Check failed',
        lastCheck: Date.now()
      };
    } finally {
      this.phpHealthCheckInProgress = false;
      // Schedule next check in 60 seconds
      setTimeout(() => this.checkPhpHealthBackground(), 60000);
    }
  }

  @Get()
  async checkHealth() {
    // Run DB and Redis checks in parallel (they're fast)
    const [dbHealth, redisHealth] = await Promise.all([
      this.checkDatabase(),
      this.sessionService.ping()
    ]);

    // Use cached PHP health (non-blocking)
    // If cache is stale (> 2 minutes), trigger background refresh
    const cacheAge = Date.now() - this.phpHealthCache.lastCheck;
    if (cacheAge > 120000 && !this.phpHealthCheckInProgress) {
      this.checkPhpHealthBackground();
    }

    const phpStatus = this.phpHealthCache.connected;

    return {
      status: phpStatus && dbHealth && redisHealth ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        php_backend: {
          status: phpStatus ? 'up' : 'down',
          latency: this.phpHealthCache.latency,
          error: this.phpHealthCache.error,
          cached: true,
          cacheAge: Math.round(cacheAge / 1000)
        },
        database: {
          status: dbHealth ? 'up' : 'down'
        },
        redis: {
          status: redisHealth ? 'up' : 'down'
        }
      }
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return true;
    } catch (e) {
      return false;
    }
  }
}
