import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../..');
const docsRoot = path.resolve(currentDir, '../docs');
const openApiPath = path.resolve(currentDir, '../static/openapi/nexus-openapi.json');

const BANNED_PHRASES = [
  /\bit is important to note\b/i,
  /\bin summary\b/i,
  /\bin conclusion\b/i,
  /\bseamless(?:ly)?\b/i,
  /\brobust(?:ness)?\b/i,
  /\bcutting-edge\b/i,
  /\bgame-changer\b/i,
  /\bdocs-site\b/i,
];

const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;
const VIETNAMESE_CHAR_PATTERN =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const BOLD_COLON_BULLET_PATTERN = /^\s*[-*]\s+\*\*[^*]+\*\*\s*:/;
const AMPERSAND_PROSE_PATTERN = /(?:^|\s)&(?:\s|$)/;
const MID_SENTENCE_BOLD_PATTERN = /[a-z0-9,;:]\s+\*\*[^*]+\*\*/i;

function collectMarkdownFiles(dir, baseDir = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function stripInlineCodeAndLinks(line) {
  return line
    .replace(/`[^`]*`/g, 'CODE')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'URL');
}

function validateMarkdownFile(filePath) {
  const relPath = path.relative(repoRoot, filePath).replaceAll('\\', '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const errors = [];

  let inFrontmatter = false;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const lineNo = i + 1;

    if (i === 0 && rawLine.trim() === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (rawLine.trim() === '---') {
        inFrontmatter = false;
      }
      continue;
    }

    if (rawLine.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }

    const stripped = stripInlineCodeAndLinks(rawLine);

    if (EMOJI_PATTERN.test(stripped)) {
      errors.push(`${relPath}:${lineNo} contains decorative emoji`);
    }

    if (VIETNAMESE_CHAR_PATTERN.test(stripped)) {
      errors.push(`${relPath}:${lineNo} contains non-English Vietnamese characters`);
    }

    if (BOLD_COLON_BULLET_PATTERN.test(rawLine)) {
      errors.push(`${relPath}:${lineNo} uses bold-term-colon bullet format`);
    }

    if (AMPERSAND_PROSE_PATTERN.test(stripped)) {
      errors.push(`${relPath}:${lineNo} uses "&" in prose instead of "and"`);
    }

    const isHeading = /^\s*#{1,6}\s/.test(rawLine);
    const isTableRow = /^\s*\|/.test(rawLine);
    const isAdmonition = /^\s*>/.test(rawLine);
    if (!isHeading && !isTableRow && !isAdmonition && MID_SENTENCE_BOLD_PATTERN.test(stripped)) {
      errors.push(`${relPath}:${lineNo} uses mid-sentence bold emphasis`);
    }

    for (const phrase of BANNED_PHRASES) {
      if (phrase.test(stripped)) {
        errors.push(`${relPath}:${lineNo} matches banned phrase ${phrase}`);
      }
    }
  }

  return errors;
}

const targetFiles = [...collectMarkdownFiles(docsRoot)];
for (const rootFile of ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'infra/README.md']) {
  const fullPath = path.join(repoRoot, rootFile);
  if (fs.existsSync(fullPath)) {
    targetFiles.push(fullPath);
  }
}

let hasError = false;

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

const allErrors = [];
for (const file of targetFiles) {
  allErrors.push(...validateMarkdownFile(file));
}

if (allErrors.length > 0) {
  for (const err of allErrors) {
    console.error(`[docs:check] ${err}`);
  }
  console.error(`[docs:check] Failed with ${allErrors.length} style/content violation(s).`);
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.info(`[docs:check] Passed (${targetFiles.length} English documentation files verified).`);
