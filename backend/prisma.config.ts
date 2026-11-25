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
    // Needed by `prisma migrate dev` and by `migrate diff --from-migrations`,
    // which is how the migrations are checked against the schema. Without it
    // that check cannot run at all, which is why the two drifted unnoticed.
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
  migrations: {
    // The managed seed creates system rows only, so it is safe wherever Prisma
    // runs it. Demo data is a separate, explicit command.
    seed: 'ts-node prisma/seeds/system.ts',
  },
});
