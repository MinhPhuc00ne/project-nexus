import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const VI_RE =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]/;

const IGNORED_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '.docusaurus']);

function walk(dir, exts = /\.(ts|tsx|mjs|js|json|md|mdx|html)$/) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.test(entry.name)) out.push(full);
  }
  return out;
}

function isFrontendTestFixture(rel) {
  return (
    rel.startsWith('frontend/src/') &&
    (rel.includes('/__tests__/') || /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(rel))
  );
}

/**
 * Updates per-file block state on every line so multi-line exemption blocks
 * only permit string literals strictly inside allowed data declarations.
 */
function advanceLineContext(rel, line, ctx) {
  const trimmed = line.trim();
  if (ctx.file !== rel) {
    ctx.file = rel;
    ctx.inSensitiveKeywords = false;
    ctx.inProvinceArray = false;
    ctx.inPresetKeywordArray = false;
  }

  if (rel === 'backend/src/core/moderation/content-moderation.util.ts') {
    if (trimmed.startsWith('export const SENSITIVE_KEYWORDS')) {
      ctx.inSensitiveKeywords = !trimmed.includes('];');
    } else if (ctx.inSensitiveKeywords && trimmed.startsWith('];')) {
      ctx.inSensitiveKeywords = false;
    }
  } else if (rel === 'frontend/src/components/products/SearchFilterSidebar.tsx') {
    if (/^(?:const|export const)\s+(?:POPULAR_CITIES|ALL_CITIES)\s*=\s*\[/.test(trimmed)) {
      ctx.inProvinceArray = !trimmed.includes('];');
    } else if (ctx.inProvinceArray && trimmed.startsWith('];')) {
      ctx.inProvinceArray = false;
    }
  } else if (rel === 'frontend/src/components/address/AdministrativeAddressSelect.tsx') {
    if (/^(?:const|export const)\s+(?:FALLBACK_PROVINCES|priorityOrder)\s*=\s*\[/.test(trimmed)) {
      ctx.inProvinceArray = !trimmed.includes('];');
    } else if (ctx.inProvinceArray && trimmed.startsWith('];')) {
      ctx.inProvinceArray = false;
    }
  } else if (rel === 'frontend/src/components/auction/showcase/preset3dModels.ts') {
    if (/^(?:keywords|excludedPrefixes):\s*\[/.test(trimmed)) {
      ctx.inPresetKeywordArray = !trimmed.includes('],');
    } else if (ctx.inPresetKeywordArray && trimmed.startsWith('],')) {
      ctx.inPresetKeywordArray = false;
    }
  }
}

/**
 * Tightly scoped line-level exemptions for non-exempt source files.
 * Any Vietnamese comment, log, exception, or UI label outside these exact
 * keyword/province/regex boundaries is still flagged as a violation.
 */
function isAllowedVietnameseLine(rel, line, ctx) {
  const trimmed = line.trim();

  // 1. Intentional native endonym in i18n language config
  if (rel === 'frontend/src/i18n/config.ts') {
    return trimmed.includes("code: 'vi'") && trimmed.includes("label: 'Tiếng Việt'");
  }

  // 2. Backend content moderation keyword list + diacritics regex (AGENTS.md §3)
  if (rel === 'backend/src/core/moderation/content-moderation.util.ts') {
    if (ctx.inSensitiveKeywords) {
      return /^'[^']+',?$/.test(trimmed);
    }
    return /^return \/\[[^\]]+\]\/i\.test\(str\);$/.test(trimmed);
  }

  // 3. 63 Vietnam provinces data + GHN Vietnam address normalization
  if (rel === 'frontend/src/constants/vietnamProvinces.ts') {
    return /^'[^']+',?$/.test(trimmed);
  }

  if (rel === 'frontend/src/components/products/SearchFilterSidebar.tsx') {
    if (/^const POPULAR_CITIES = \[/.test(trimmed)) {
      return /^const POPULAR_CITIES = \[(?:'[^']+',\s*)*'[^']+'\];$/.test(trimmed);
    }
    return ctx.inProvinceArray && /^'[^']+',?$/.test(trimmed);
  }

  if (rel === 'frontend/src/components/address/AdministrativeAddressSelect.tsx') {
    if (ctx.inProvinceArray) {
      return /^'[^']+',?$/.test(trimmed);
    }
    return (
      trimmed === "lower.includes('tỉnh - 0') ||" ||
      trimmed.startsWith('.replace(/^(tỉnh|thành phố|tp\\.|tp)\\s+/i')
    );
  }

  if (
    rel === 'frontend/src/components/checkout/CheckoutAddressSection.tsx' ||
    rel === 'frontend/src/features/orders/services/orders.ts' ||
    rel === 'frontend/src/pages/buyer/BuyerAddressesPage.tsx' ||
    rel === 'frontend/src/pages/buyer/CheckoutPage.tsx'
  ) {
    return /^city:\s*(?:currentAddress\.city\s*\|\|\s*)?'TP\. Hồ Chí Minh',?$/.test(trimmed);
  }

  // 4. 3D showcase Vietnamese search keywords & exclusions (labels/comments stay English-US)
  if (rel === 'frontend/src/components/auction/showcase/preset3dModels.ts') {
    if (/^(?:keywords|excludedPrefixes):\s*\[/.test(trimmed)) {
      return /^(?:keywords|excludedPrefixes):\s*\[(?:'[^']+',\s*)*'[^']+'\],?$/.test(trimmed);
    }
    return ctx.inPresetKeywordArray && /^'[^']+',?$/.test(trimmed);
  }

  // 5. Legacy Vietnamese notification routing fallback keyword matchers
  if (rel === 'frontend/src/utils/notificationNavigation.ts') {
    return (
      trimmed.startsWith('return text.match(') ||
      trimmed.includes('text.includes(') ||
      trimmed.includes("item.title?.startsWith('Cơ hội mua ')")
    );
  }

  if (rel === 'frontend/src/pages/staff/staffNotificationNavigation.ts') {
    return (
      /\/[^/]+\/\.test\(/.test(trimmed) || /\.test\((?:resourceType \|\| )?action\)/.test(trimmed)
    );
  }

  if (rel === 'frontend/src/components/seller/SellerNotifications.tsx') {
    return trimmed.includes(".includes('đánh giá')") || trimmed.includes(".includes('xu hướng')");
  }

  return false;
}

const scanFiles = [
  ...walk(path.join(ROOT, 'backend/src')),
  ...walk(path.join(ROOT, 'frontend/src')).filter((file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    return (
      !rel.startsWith('frontend/src/i18n/locales/vi/') &&
      !rel.startsWith('frontend/src/i18n/locales/en/') &&
      !isFrontendTestFixture(rel)
    );
  }),
  ...walk(path.join(ROOT, 'packages/contracts/src')),
  ...walk(path.join(ROOT, 'packages/config')),
  ...walk(path.join(ROOT, 'docs/docs')),
  path.join(ROOT, 'backend/prisma/seeds/system.ts'),
  path.join(ROOT, 'backend/prisma/seeds/admin-create.ts'),
  path.join(ROOT, 'backend/prisma/seeds/client.ts'),
  path.join(ROOT, 'docs/static/openapi/nexus-openapi.json'),
  path.join(ROOT, 'frontend/index.html'),
];

const violations = [];
const lineCtx = {
  file: '',
  inSensitiveKeywords: false,
  inProvinceArray: false,
  inPresetKeywordArray: false,
};

for (const file of scanFiles) {
  if (!fs.existsSync(file)) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    advanceLineContext(rel, line, lineCtx);
    if (VI_RE.test(line) && !isAllowedVietnameseLine(rel, line, lineCtx)) {
      violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
    }
  });
}

// Check English i18n locale values (excluding the intentional native endonym "Tiếng Việt")
const enLocaleDir = path.join(ROOT, 'frontend/src/i18n/locales/en');
const enFiles = walk(enLocaleDir);
for (const file of enFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const checkValues = (node, keyPath = []) => {
    if (typeof node === 'string') {
      if (node === 'Tiếng Việt') return;
      if (VI_RE.test(node)) {
        violations.push(`${rel} [${keyPath.join('.')}]: ${node}`);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => checkValues(item, [...keyPath, String(i)]));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (VI_RE.test(k)) {
          violations.push(`${rel} [${[...keyPath, k].join('.')}]: Vietnamese key "${k}"`);
        }
        checkValues(v, [...keyPath, k]);
      }
    }
  };
  checkValues(json);
}

if (violations.length > 0) {
  console.error('English-US language guard failed:');
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
}

console.info(
  `English-US language guard passed (${scanFiles.length} source/docs files + ${enFiles.length} English i18n files).`,
);
