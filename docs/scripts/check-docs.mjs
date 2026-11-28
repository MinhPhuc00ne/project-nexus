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
  /\bplays a crucial role\b/i,
  /\bheart of the system\b/i,
  /\bpowerhouse\b/i,
  /\bin order to\b/i,
  /\blet['’]?s explore\b/i,
  /\bdelve into\b/i,
];

const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;
const VIETNAMESE_CHAR_PATTERN =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const BOLD_COLON_BULLET_PATTERN = /^\s*(?:[-*]|\d+\.)\s+\*\*[^*]+\*\*\s*:/;
const AMPERSAND_PROSE_PATTERN = /(?:^|\s)&(?:\s|$)/;
const MID_SENTENCE_BOLD_PATTERN = /[a-z0-9,;:]\s+\*\*[^*]+\*\*/i;
const SLASH_COMPOUND_PATTERN = /\b[A-Za-z]{2,}\/[A-Za-z]{2,}\b/;

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

function stripCodeLinksAndPaths(line) {
  return line
    .replace(/`[^`]*`/g, 'CODE')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, 'LINK')
    .replace(/https?:\/\/\S+/g, 'URL');
}

function extractMarkdownLinkTargets(line) {
  const withoutInlineCode = line.replace(/`[^`]*`/g, '');
  const targets = [];
  let cursor = 0;

  while (cursor < withoutInlineCode.length) {
    const openBracket = withoutInlineCode.indexOf('[', cursor);
    if (openBracket === -1) break;
    const closeAndOpenParen = withoutInlineCode.indexOf('](', openBracket + 1);
    if (closeAndOpenParen === -1) break;
    const closeParen = withoutInlineCode.indexOf(')', closeAndOpenParen + 2);
    if (closeParen === -1) break;

    targets.push(withoutInlineCode.slice(closeAndOpenParen + 2, closeParen));
    cursor = closeParen + 1;
  }

  return targets;
}

function extractRelativeTarget(rawTarget) {
  let target = rawTarget.trim();
  if (!target) return null;
  if (target.startsWith('<') && target.includes('>')) {
    target = target.slice(1, target.indexOf('>')).trim();
  } else {
    const firstWhitespace = target.search(/\s/);
    if (firstWhitespace !== -1) {
      const rest = target.slice(firstWhitespace).trimStart();
      if (rest.startsWith('"') || rest.startsWith("'")) {
        target = target.slice(0, firstWhitespace).trim();
      }
    }
  }
  if (
    !target ||
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^(?:https?:|mailto:|tel:|data:)/i.test(target)
  ) {
    return null;
  }
  const cleanTarget = target.split(/[?#]/)[0].trim();
  if (!cleanTarget) return null;
  try {
    return { raw: target, pathPart: decodeURIComponent(cleanTarget) };
  } catch {
    return { raw: target, pathPart: cleanTarget };
  }
}

function collectBrokenRelativeLinks(rawLine, sourceDir, relPath, lineNo) {
  const broken = [];
  for (const rawTarget of extractMarkdownLinkTargets(rawLine)) {
    const parsed = extractRelativeTarget(rawTarget);
    if (!parsed) continue;
    const resolvedTarget = path.resolve(sourceDir, parsed.pathPart);
    if (!fs.existsSync(resolvedTarget)) {
      broken.push(`${relPath}:${lineNo} contains broken relative link "${parsed.raw}"`);
    }
  }
  return broken;
}

function validateMarkdownFile(filePath) {
  const relPath = path.relative(repoRoot, filePath).replaceAll('\\', '/');
  const sourceDir = path.dirname(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const errors = [];

  let inFrontmatter = false;
  let activeFence = null;

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

    const fenceMatch = /^\s*(```+|~~~+)/.exec(rawLine);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      if (!activeFence) {
        activeFence = fence;
        continue;
      }
      if (fence[0] === activeFence[0] && fence.length >= activeFence.length) {
        activeFence = null;
        continue;
      }
    }
    if (activeFence) {
      continue;
    }

    errors.push(...collectBrokenRelativeLinks(rawLine, sourceDir, relPath, lineNo));

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

    const slashChecked = stripCodeLinksAndPaths(rawLine);
    const slashMatch = SLASH_COMPOUND_PATTERN.exec(slashChecked);
    if (slashMatch) {
      errors.push(`${relPath}:${lineNo} uses slash-separated compound "${slashMatch[0]}" in prose`);
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
for (const rootFile of [
  'AGENTS.md',
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'infra/README.md',
]) {
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
