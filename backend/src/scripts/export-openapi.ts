import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as prettier from 'prettier';
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
  // Written the way the repository's formatter would write it. The committed
  // file goes through Prettier like every other file, so a plain
  // `JSON.stringify` left the two permanently one reformat apart: regenerating
  // produced a diff of several thousand lines in which no route and no schema
  // had changed, indistinguishable from one in which something had. CI now
  // compares the two, so the comparison has to mean something.
  //
  // The indent before Prettier is not redundant. Prettier keeps an object
  // expanded when its input had a newline after the brace, so handing it one
  // long line would collapse the whole document instead of reproducing the
  // committed shape.
  const serialized = await prettier.format(JSON.stringify(document, null, 2), {
    ...(await prettier.resolveConfig(outputPath)),
    filepath: outputPath,
  });
  fs.writeFileSync(outputPath, serialized, 'utf8');

  await app.close();
  console.info(`OpenAPI specification exported to ${outputPath}`);
}

void exportOpenApi();
