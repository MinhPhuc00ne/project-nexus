#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..');
const repoRoot = path.resolve(backendDir, '..');
const require = createRequire(path.join(backendDir, 'package.json'));
const dotenv = require('dotenv');

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
  let envFile;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--env-file' && argv[i + 1]) {
      envFile = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--env-file=')) {
      envFile = arg.slice('--env-file='.length);
    }
  }
  return { envFile };
}

function resolveEnvPath(explicitPath) {
  if (explicitPath) {
    const fromCwd = path.resolve(process.cwd(), explicitPath);
    if (existsSync(fromCwd)) return fromCwd;
    const fromRoot = path.resolve(repoRoot, explicitPath);
    if (existsSync(fromRoot)) return fromRoot;
    throw new Error(`Environment file not found: ${explicitPath}`);
  }
  const candidates = [path.join(repoRoot, '.env'), path.join(backendDir, '.env')];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function maskSecret(value) {
  if (!value) return '(not set)';
  const trimmed = String(value).trim();
  if (!trimmed) return '(not set)';
  if (trimmed.length <= 6) return '***';
  return `***${trimmed.slice(-4)}`;
}

function describeDatabase(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    return maskSecret(rawUrl);
  }
}

function describeRedis(env) {
  if (env.REDIS_URL) {
    try {
      const parsed = new URL(env.REDIS_URL);
      return `${parsed.protocol}//${parsed.hostname}:${parsed.port || '6379'}`;
    } catch {
      return 'REDIS_URL (configured)';
    }
  }
  return `${env.REDIS_HOST}:${env.REDIS_PORT}${env.REDIS_PASSWORD ? ' (auth)' : ''}`;
}

function main() {
  const { envFile } = parseArgs(process.argv.slice(2));
  const resolvedPath = resolveEnvPath(envFile);
  const fileValues = resolvedPath ? dotenv.parse(readFileSync(resolvedPath, 'utf8')) : {};
  const candidateEnv = envFile ? fileValues : { ...fileValues, ...process.env };

  const { validateBackendEnv } = loadEnvSchemaModule();
  const parsed = validateBackendEnv(candidateEnv);

  const activePort = parsed.PORT ?? parsed.PORT_BACKEND;
  const rows = [
    ['appEnv', `${parsed.APP_ENV} (NODE_ENV=${parsed.NODE_ENV})`],
    ['port', `${activePort} (PORT=${parsed.PORT ?? 'unset'}, PORT_BACKEND=${parsed.PORT_BACKEND})`],
    ['database', describeDatabase(parsed.DATABASE_URL)],
    ['redis', describeRedis(parsed)],
    [
      'payment',
      parsed.PAYMENT_PROVIDER === 'payos'
        ? `payos (client=${maskSecret(parsed.PAYOS_CLIENT_ID)})`
        : 'sandbox',
    ],
    [
      'shipping',
      parsed.SHIPPING_PROVIDER === 'ghn'
        ? `ghn (shop=${maskSecret(parsed.GHN_SHOP_ID)})`
        : 'sandbox',
    ],
    [
      'storage',
      parsed.STORAGE_PROVIDER === 'cloudinary'
        ? `cloudinary (cloud=${maskSecret(parsed.CLOUDINARY_CLOUD_NAME)})`
        : 'local',
    ],
    [
      'mail',
      parsed.MAIL_PROVIDER === 'smtp'
        ? `smtp (${parsed.SMTP_HOST}:${parsed.SMTP_PORT}, user=${maskSecret(parsed.SMTP_USER)})`
        : 'console',
    ],
    ['swagger', parsed.SWAGGER_ENABLED ? 'enabled' : 'disabled'],
    [
      'chatbotAi',
      parsed.CHATBOT_AI_ENABLED
        ? `enabled (${parsed.CHATBOT_GEMINI_MODEL}, key=${maskSecret(parsed.GEMINI_API_KEY)})`
        : 'disabled',
    ],
    [
      'googleOAuth',
      parsed.GOOGLE_CLIENT_ID
        ? `enabled (client=${maskSecret(parsed.GOOGLE_CLIENT_ID)})`
        : 'disabled',
    ],
  ];

  console.info(
    `[env:check] Validated ${resolvedPath ? path.relative(repoRoot, resolvedPath) || '.env' : 'process.env'}.`,
  );
  const keyWidth = Math.max(...rows.map(([k]) => k.length));
  for (const [setting, value] of rows) {
    console.info(`  ${setting.padEnd(keyWidth)} : ${value}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`[env:check] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
