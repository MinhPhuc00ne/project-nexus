/* eslint-disable sonarjs/no-os-command-from-path */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(currentDir, '../docs');

function collectPages(dir, baseDir = dir) {
  const pages = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pages.push(...collectPages(fullPath, baseDir));
    } else if (entry.name.endsWith('.md')) {
      pages.push({
        relPath: path.relative(baseDir, fullPath).replaceAll('\\', '/'),
        fullPath,
      });
    }
  }
  return pages.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { title: null, body: raw.trim() };
  }
  const endIndex = lines.indexOf('---', 1);
  if (endIndex === -1) {
    return { title: null, body: raw.trim() };
  }
  const fmLines = lines.slice(1, endIndex);
  let title = null;
  for (const line of fmLines) {
    if (line.startsWith('title:')) {
      title = line
        .slice('title:'.length)
        .trim()
        .replace(/^["']|["']$/g, '');
      break;
    }
  }
  return {
    title,
    body: lines
      .slice(endIndex + 1)
      .join('\n')
      .trim(),
  };
}

function runGlab(args) {
  return execFileSync('glab', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const existingRaw = runGlab(['api', 'projects/:id/wikis']);
const existingWikis = JSON.parse(existingRaw);
const existingSlugs = new Set(existingWikis.map((item) => item.slug));

const pages = collectPages(docsRoot);
let syncedCount = 0;

for (const page of pages) {
  const raw = fs.readFileSync(page.fullPath, 'utf8');
  const { title, body } = parseFrontmatter(raw);
  const slug = page.relPath === 'intro.md' ? 'home' : page.relPath.replace(/\.md$/, '');
  const resolvedTitle = slug === 'home' ? 'home' : title || slug;
  const content = `${body}\n\n---\n*Synced automatically from \`docs-site/docs/${page.relPath}\`.*\n`;

  if (existingSlugs.has(slug)) {
    const encodedSlug = encodeURIComponent(slug);
    runGlab([
      'api',
      '-X',
      'PUT',
      `projects/:id/wikis/${encodedSlug}`,
      '-f',
      `title=${resolvedTitle}`,
      '-f',
      `content=${content}`,
      '-f',
      'format=markdown',
    ]);
    console.info(`[wiki] Updated: ${slug}`);
  } else {
    runGlab([
      'api',
      '-X',
      'POST',
      'projects/:id/wikis',
      '-f',
      `title=${slug}`,
      '-f',
      `content=${content}`,
      '-f',
      'format=markdown',
    ]);
    if (resolvedTitle !== slug) {
      const encodedSlug = encodeURIComponent(slug);
      runGlab([
        'api',
        '-X',
        'PUT',
        `projects/:id/wikis/${encodedSlug}`,
        '-f',
        `title=${resolvedTitle}`,
        '-f',
        `content=${content}`,
        '-f',
        'format=markdown',
      ]);
    }
    console.info(`[wiki] Created: ${slug}`);
  }
  syncedCount += 1;
}

console.info(`[wiki] Synced ${syncedCount} pages to GitLab Wiki successfully.`);
