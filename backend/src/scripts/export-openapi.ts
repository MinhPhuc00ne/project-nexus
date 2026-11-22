import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppModule } from '../app.module';
import { buildSwaggerConfig } from '../swagger.config';

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: ['error'],
  });
  app.setGlobalPrefix('api/v1');

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const outputPath = path.resolve(process.cwd(), '../docs-site/static/openapi/nexus-openapi.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  await app.close();
  console.info(`OpenAPI specification exported to ${outputPath}`);
}

void exportOpenApi();
