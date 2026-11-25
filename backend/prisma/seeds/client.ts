/**
 * Builds the Prisma client the seeds use.
 *
 * Prisma 7 requires an explicit driver adapter, and the seeds run outside Nest,
 * so they cannot borrow the application's PrismaService. The connection string
 * comes from the environment with no fallback: the old seed defaulted to a
 * hardcoded local database, which meant a mistyped DATABASE_URL silently seeded
 * somewhere else.
 */
import * as path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

/** Loads the repository .env, matching how the backend and prisma.config.ts resolve it. */
export function loadSeedEnv(): void {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
}

/**
 * Creates a connected-on-demand Prisma client for a seed run.
 *
 * @returns The client.
 * @throws Error when DATABASE_URL is absent.
 */
export function createSeedClient(): PrismaClient {
  loadSeedEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set; seeds refuse to guess which database to write to');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Which database a seed is about to write to, safe to print. */
export function describeTarget(): string {
  const raw = process.env.DATABASE_URL ?? '';
  try {
    const url = new URL(raw);
    return `${url.hostname}:${url.port || '5432'}${url.pathname}`;
  } catch {
    return '<unparsable DATABASE_URL>';
  }
}
