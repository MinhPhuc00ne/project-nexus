import * as path from 'path';
import * as dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
