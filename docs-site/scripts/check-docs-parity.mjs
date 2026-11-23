import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const viRoot = path.resolve(currentDir, '../docs');
const enRoot = path.resolve(currentDir, '../i18n/en/docusaurus-plugin-content-docs/current');
const openApiPath = path.resolve(currentDir, '../static/openapi/nexus-openapi.json');

function collectMarkdownFiles(dir, baseDir = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      results.push(path.relative(baseDir, fullPath).replaceAll('\\', '/'));
    }
  }
  return results.sort();
}

const viFiles = collectMarkdownFiles(viRoot);
const enFiles = collectMarkdownFiles(enRoot);

let hasError = false;

for (const file of viFiles) {
  if (!enFiles.includes(file)) {
    console.error(`[docs:check] Missing English translation for: ${file}`);
    hasError = true;
  }
}

for (const file of enFiles) {
  if (!viFiles.includes(file)) {
    console.error(`[docs:check] Extra English file without Vietnamese source: ${file}`);
    hasError = true;
  }
}

if (!fs.existsSync(openApiPath)) {
  console.error(`[docs:check] Missing OpenAPI spec at ${openApiPath}`);
  hasError = true;
} else {
  const spec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
  const pathCount = Object.keys(spec.paths || {}).length;
  if (!spec.openapi || pathCount === 0) {
    console.error('[docs:check] OpenAPI spec is invalid or contains zero paths.');
    hasError = true;
  } else {
    console.info(`[docs:check] OpenAPI spec valid (${pathCount} paths).`);
  }
}

if (hasError) {
  process.exit(1);
}

console.info(`[docs:check] Passed (${viFiles.length} bilingual documentation pages verified).`);
