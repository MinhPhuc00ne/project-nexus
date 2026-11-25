import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppModule } from '../app.module';
import { buildSwaggerConfig } from '../swagger.config';

function ensureOpenApiPreviewEnv(): void {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://openapi:openapi@localhost:5432/openapi?schema=public';
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    process.env.JWT_SECRET = 'openapi-preview-jwt-secret-key';
  }
  if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 16) {
    process.env.REFRESH_TOKEN_SECRET = 'openapi-preview-refresh-secret-key';
  }
}

async function exportOpenApi(): Promise<void> {
  ensureOpenApiPreviewEnv();
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: ['error'],
  });
  app.setGlobalPrefix('api/v1');

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const outputPath = path.resolve(process.cwd(), '../docs/static/openapi/nexus-openapi.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  await app.close();
  console.info(`OpenAPI specification exported to ${outputPath}`);
}

void exportOpenApi();
