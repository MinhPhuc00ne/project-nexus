import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as NestLogger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppModule } from './app.module';
import { createCorsOriginCallback, parseCorsOrigins } from './core/config/env.schema';
import { GlobalHttpExceptionFilter } from './core/filters/global-http-exception.filter';
import { TransformResponseInterceptor } from './core/interceptors/transform-response.interceptor';
import { ProviderConfigService } from './core/providers/provider-config.service';
import { buildSwaggerConfig } from './swagger.config';

async function bootstrap(): Promise<void> {
  const logger = new NestLogger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));

  app.set('trust proxy', 1);
  app.enableShutdownHooks();
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Set global API prefix matching Frontend expectations (/api/v1)
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);
  const allowedOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS'),
    configService.get<string>('FRONTEND_URL') || 'http://localhost:5173',
  );

  app.enableCors({
    origin: createCorsOriginCallback(() => allowedOrigins),
    credentials: true,
  });

  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  const providers = app.get(ProviderConfigService);
  if (providers.isLocalStorage()) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const mediaDir = path.join(uploadsDir, 'media');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    app.use('/uploads', express.static(uploadsDir));
    app.use('/api/v1/uploads', express.static(uploadsDir));
  }

  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED') ?? false;
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
    SwaggerModule.setup('api/docs', app, document);
  }

  const port =
    configService.get<number>('PORT') ||
    Number(process.env.PORT) ||
    configService.get<number>('PORT_BACKEND') ||
    Number(process.env.PORT_BACKEND) ||
    3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Nexus Backend Monolith running on: http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    logger.log(`Interactive Swagger Docs available at: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
