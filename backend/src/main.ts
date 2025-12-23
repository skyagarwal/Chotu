import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { join } from 'path';
import axios from 'axios';
import { Response } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Enable WebSocket support with Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);
  const port = configService.get('app.port');
  const env = configService.get('app.env');
  const appName = configService.get('app.name');

  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix for all routes (except health check)
  app.setGlobalPrefix('api', {
    exclude: ['health', 'ready', 'metrics'],
  });

  // Enable CORS with proper configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://chat.mangwale.ai',
      'https://admin.mangwale.ai',
      /^https?:\/\/.*\.mangwale\.ai$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  
  logger.log('✅ CORS enabled for frontend origins');

  // Health check endpoint - REMOVED in favor of HealthController
  // app.getHttpAdapter().get('/health', (req, res: Response) => {
  //   res.status(200).json({
  //     status: 'ok',
  //     service: appName,
  //     timestamp: new Date().toISOString(),
  //     uptime: Math.floor(process.uptime()),
  //     environment: env,
  //   });
  // });

  // Readiness probe: quick check to PHP backend (non-blocking, short timeout)
  app.getHttpAdapter().get('/ready', async (_req, res: Response) => {
    const phpBaseUrl = configService.get<string>('php.baseUrl') || process.env.PHP_BACKEND_URL;
    const checkUrl = phpBaseUrl ? `${phpBaseUrl.replace(/\/$/, '')}/api/v1/module` : null;
    const start = Date.now();
    try {
      if (!checkUrl) throw new Error('PHP base URL not configured');
      const resp = await axios.get(checkUrl, { timeout: 1500 });
      res.status(200).json({
        status: 'ready',
        php: {
          url: phpBaseUrl,
          ok: true,
          statusCode: resp.status,
        },
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(503).json({
        status: 'degraded',
        php: {
          url: phpBaseUrl,
          ok: false,
          error: e?.message || 'unknown',
        },
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Metrics endpoint
  app.getHttpAdapter().get('/metrics', (req, res: Response) => {
    res.status(200).json({
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 ${appName} running on port ${port}`);
  logger.log(`🌍 Environment: ${env}`);
  logger.log(`🔗 Health check: http://localhost:${port}/health`);
  logger.log(`📱 WhatsApp webhook: http://localhost:${port}/webhook/whatsapp`);
  logger.log('✅ Application started successfully');
}

bootstrap();

