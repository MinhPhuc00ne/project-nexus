import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const VI_RE =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]/;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|mjs|js|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const strictTargets = [
  ...walk(path.join(ROOT, 'packages/contracts/src')),
  path.join(ROOT, 'backend/prisma/seeds/system.ts'),
  path.join(ROOT, 'backend/prisma/seeds/admin-create.ts'),
  path.join(ROOT, 'frontend/index.html'),
  path.join(ROOT, 'frontend/src/features/catalog/services/banners.ts'),
  path.join(ROOT, 'frontend/src/pages/staff/staffNavigationData.ts'),
];

const violations = [];

for (const file of strictTargets) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (VI_RE.test(line)) {
      violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
    }
  });
}

// Check English i18n locale values (excluding the intentional native endonym "Tiếng Việt")
const enLocaleDir = path.join(ROOT, 'frontend/src/i18n/locales/en');
for (const file of walk(enLocaleDir)) {
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
  console.error('English-US language guard failed on strict surfaces:');
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
}

console.info(
  `English-US language guard passed (${strictTargets.length} strict files + frontend/src/i18n/locales/en).`,
);
