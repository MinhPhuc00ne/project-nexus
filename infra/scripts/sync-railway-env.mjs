#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const backendDir = path.join(repoRoot, 'backend');
const require = createRequire(path.join(backendDir, 'package.json'));
const dotenv = require('dotenv');

const EXCLUDED_KEYS = new Set([
  'DATABASE_URL',
  'REDIS_URL',
  'SHADOW_DATABASE_URL',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'POSTGRES_PORT',
]);

const SENSITIVE_KEY_PATTERN = /(SECRET|KEY|TOKEN|PASS|PASSWORD|URL)/i;

function loadEnvSchemaModule() {
  const distPath = path.join(backendDir, 'dist', 'core', 'config', 'env.schema.js');
  if (existsSync(distPath)) {
    return require(distPath);
  }
  const tsNode = require('ts-node');
  tsNode.register({
    project: path.join(backendDir, 'tsconfig.json'),
    transpileOnly: true,
  });
  return require(path.join(backendDir, 'src', 'core', 'config', 'env.schema.ts'));
}

function parseArgs(argv) {
  let envFile = '.env';
  let apply = false;
  let service;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      apply = true;
    } else if (arg === '--env-file' && argv[i + 1]) {
      envFile = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--env-file=')) {
      envFile = arg.slice('--env-file='.length);
    } else if (arg === '--service' && argv[i + 1]) {
      service = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--service=')) {
      service = arg.slice('--service='.length);
    }
  }
  return { envFile, apply, service };
}

function maskValue(key, value) {
  if (
    !SENSITIVE_KEY_PATTERN.test(key) ||
    key === 'FRONTEND_URL' ||
    key === 'CORS_ORIGINS' ||
    key === 'APP_PUBLIC_URL'
  ) {
    return value;
  }
  if (value.length <= 6) return '***';
  return `***${value.slice(-4)}`;
}

function resolveRailwayExecutable() {
  if (process.env.RAILWAY_BIN && existsSync(process.env.RAILWAY_BIN)) {
    return process.env.RAILWAY_BIN;
  }
  const pathEntries = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  const candidates =
    process.platform === 'win32' ? ['railway.exe', 'railway.cmd', 'railway'] : ['railway'];
  for (const dir of pathEntries) {
    for (const candidate of candidates) {
      const fullPath = path.join(dir, candidate);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  throw new Error('Railway CLI ("railway") not found on PATH. Install it or set RAILWAY_BIN.');
}

function main() {
  const { envFile, apply, service } = parseArgs(process.argv.slice(2));
  const resolvedPath = path.isAbsolute(envFile) ? envFile : path.resolve(repoRoot, envFile);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Environment file not found: ${resolvedPath}`);
  }

  const rawValues = dotenv.parse(readFileSync(resolvedPath, 'utf8'));
  const { validateBackendEnv } = loadEnvSchemaModule();
  validateBackendEnv(rawValues);

  const entriesToSync = Object.entries(rawValues).filter(([key, value]) => {
    if (EXCLUDED_KEYS.has(key)) return false;
    return value.trim() !== '';
  });

  console.info(
    `[sync-railway-env] Validated ${path.relative(repoRoot, resolvedPath) || envFile} (${apply ? 'APPLY' : 'DRY-RUN'}).`,
  );
  console.info(
    `[sync-railway-env] Excluded local-only keys: ${[...EXCLUDED_KEYS].filter((k) => k in rawValues).join(', ') || 'none'}.`,
  );
  const keyWidth = entriesToSync.length > 0 ? Math.max(...entriesToSync.map(([k]) => k.length)) : 0;
  for (const [key, value] of entriesToSync) {
    console.info(`  ${key.padEnd(keyWidth)} = ${maskValue(key, value)}`);
  }

  if (!apply) {
    console.info(
      `[sync-railway-env] Dry-run complete. Re-run with --apply to push ${entriesToSync.length} variable(s) to Railway.`,
    );
    return;
  }

  if (entriesToSync.length === 0) {
    console.info('[sync-railway-env] Nothing to sync.');
    return;
  }

  const railwayBin = resolveRailwayExecutable();
  const args = ['variables'];
  if (service) {
    args.push('--service', service);
  }
  for (const [key, value] of entriesToSync) {
    args.push('--set', `${key}=${value}`);
  }

  execFileSync(railwayBin, args, { stdio: 'inherit', cwd: repoRoot });
  console.info(`[sync-railway-env] Synced ${entriesToSync.length} variable(s) to Railway.`);
}

try {
  main();
} catch (error) {
  console.error(`[sync-railway-env] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
