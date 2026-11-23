import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const localesRoot = path.resolve(currentDir, '../src/i18n/locales');
const baseLang = 'vi';

function flattenKeys(obj, prefix = '') {
  const result = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [childKey, childVal] of flattenKeys(value, fullKey)) {
        result.set(childKey, childVal);
      }
    } else {
      result.set(fullKey, String(value ?? ''));
    }
  }
  return result;
}

function extractPlaceholders(text) {
  const matches = text.match(/\{\{\s*([^}\s]+)\s*\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim()))].sort();
}

const languages = fs
  .readdirSync(localesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

if (!languages.includes(baseLang)) {
  console.error(`Missing base locale directory: ${baseLang}`);
  process.exit(1);
}

const baseFiles = fs
  .readdirSync(path.join(localesRoot, baseLang))
  .filter((file) => file.endsWith('.json'))
  .sort();

let hasErrors = false;

for (const lang of languages) {
  if (lang === baseLang) continue;
  const langDir = path.join(localesRoot, lang);
  const langFiles = fs
    .readdirSync(langDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const file of baseFiles) {
    if (!langFiles.includes(file)) {
      console.error(`[${lang}] Missing namespace file: ${file}`);
      hasErrors = true;
      continue;
    }

    const baseMap = flattenKeys(
      JSON.parse(fs.readFileSync(path.join(localesRoot, baseLang, file), 'utf8')),
    );
    const targetMap = flattenKeys(JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8')));

    for (const [key, baseVal] of baseMap) {
      if (!targetMap.has(key)) {
        console.error(`[${lang}/${file}] Missing key: ${key}`);
        hasErrors = true;
        continue;
      }
      const baseVars = extractPlaceholders(baseVal);
      const targetVars = extractPlaceholders(targetMap.get(key));
      if (JSON.stringify(baseVars) !== JSON.stringify(targetVars)) {
        console.error(
          `[${lang}/${file}] Interpolation mismatch at "${key}": expected [${baseVars.join(', ')}], got [${targetVars.join(', ')}]`,
        );
        hasErrors = true;
      }
    }

    for (const key of targetMap.keys()) {
      if (!baseMap.has(key)) {
        console.error(`[${lang}/${file}] Extra key not in ${baseLang}: ${key}`);
        hasErrors = true;
      }
    }
  }
}

if (hasErrors) {
  process.exit(1);
}

console.info(
  `i18n parity check passed across ${languages.length} locales (${baseFiles.length} namespaces each).`,
);
