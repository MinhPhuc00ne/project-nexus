import { vi } from 'vitest';
import { createInstance } from 'i18next';
import { resolve, dirname } from 'node:path';
import * as react from 'react';
import * as icons from 'lucide-react';
import admin from '../../src/i18n/locales/vi/admin.json';
import seller from '../../src/i18n/locales/vi/seller.json';

const sources = import.meta.glob('../../src/**/*.{ts,tsx}');
const i18n = createInstance();
await i18n.init({ lng: 'vi', resources: { vi: { admin, seller } }, initImmediate: false });

const translations = new Map(['admin', 'seller'].map((ns) => [ns, i18n.getFixedT('vi', ns)]));

export async function load(file, dependencies = {}) {
  vi.resetModules();
  const modulePath = resolve(process.cwd(), 'src', file);
  const mocks = {
    ...dependencies,
    'react-i18next': {
      Trans: 'translation',
      useTranslation: (namespace) => ({ t: translations.get(namespace), i18n }),
    },
  };
  if (dependencies.react) mocks.react = { ...react, ...dependencies.react };
  if (dependencies['lucide-react']) mocks['lucide-react'] = icons;
  if (dependencies['react/jsx-runtime']) {
    mocks['react/jsx-dev-runtime'] = { jsxDEV: dependencies['react/jsx-runtime'].jsx };
  }
  const ids = [];
  for (const [name, exports] of Object.entries(mocks)) {
    const id = name.startsWith('.') ? resolve(dirname(modulePath), name) : name;
    ids.push(id);
    vi.doMock(id, () => ({ default: exports, ...exports }));
  }
  const i18nId = resolve(process.cwd(), 'src/i18n/index.ts');
  vi.doMock(i18nId, () => ({ default: i18n }));
  try {
    return await sources[`../../src/${file}`]();
  } finally {
    for (const id of [...ids, i18nId]) vi.doUnmock(id);
  }
}
