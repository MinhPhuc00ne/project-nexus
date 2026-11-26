import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { parseCorsOrigins } from './core/config/env.schema';
import { GlobalHttpExceptionFilter } from './core/filters/global-http-exception.filter';
import { TransformResponseInterceptor } from './core/interceptors/transform-response.interceptor';
import { SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { buildSwaggerConfig } from './swagger.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global API prefix matching Frontend expectations (/api/v1)
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);
  const allowedOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS'),
    configService.get<string>('FRONTEND_URL') || 'http://localhost:5173',
  );

  // Enable CORS for allowlisted frontend applications
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin '${origin}' not allowed by CORS`), false);
    },
    credentials: true,
  });

  // Global validation pipe adhering to Clean Code standards
  // Global Exception Filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global Response Transform Interceptor
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Serve static files uploaded by users (e.g., seller proofs, KYC docs, media)
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

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  SwaggerModule.setup('api/docs', app, document);

  const port =
    Number(process.env.PORT) ||
    configService.get<number>('PORT_BACKEND') ||
    Number(process.env.PORT_BACKEND) ||
    3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Nexus Backend Monolith running on: http://localhost:${port}/api/v1`);
  logger.log(`Interactive Swagger Docs available at: http://localhost:${port}/api/docs`);
}

void bootstrap();
