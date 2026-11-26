import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.docusaurus/**',
      '**/.agents/**',
      '**/*.min.js',
      '**/*.d.ts',
      '**/prisma/migrations/**',
    ],
  },
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-inline-comments': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 4 }],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',
      'sonarjs/super-linear-regex': 'warn',
      'sonarjs/duplicates-in-character-class': 'warn',
      'sonarjs/concise-regex': 'warn',
      'sonarjs/pseudo-random': 'warn',
      'sonarjs/regex-complexity': 'warn',
      'sonarjs/no-nested-functions': 'warn',
      'sonarjs/void-use': 'warn',
      'sonarjs/use-type-alias': 'warn',
      'sonarjs/no-clear-text-protocols': 'warn',
      'sonarjs/sql-queries': 'warn',
      'sonarjs/no-dead-store': 'warn',
      'sonarjs/no-redundant-assignments': 'warn',
      'sonarjs/no-empty-collection': 'warn',
      'sonarjs/no-unused-vars': 'warn',
      'sonarjs/no-useless-catch': 'warn',
      'sonarjs/hashing': 'warn',
      'sonarjs/empty-string-repetition': 'warn',
      'sonarjs/no-hardcoded-ip': 'warn',
    },
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // A module’s utilities, helpers and DTOs are its internals. Reaching for them
    // across a module boundary is what built a six-module import cycle, and
    // `npm run check:cycles` only catches such a reach once it closes a loop;
    // this catches the first one. Services are exempt: Nest already governs them,
    // since a provider that is not exported fails at startup.
    files: ['backend/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // A module's public surface is its exported providers and the
              // schemas describing what its endpoints accept. Everything else
              // — the helpers a service happens to be split into, the
              // functions in utils/ — is how it is built this week, and a
              // second module importing it turns a refactor into a breakage.
              // Request schemas under dtos/ stay importable on purpose: a few
              // modules administer another's resources (the back office
              // reclassifies catalog categories, auction checkout takes the
              // same address as retail checkout) and should reuse that
              // contract rather than restate it and drift from it.
              group: [
                '../../*/utils/*',
                '../../*/helpers/*',
                '../../*/services/*.helper',
                '../../*/gateways/*',
              ],
              message: `Do not import another module’s internals. Move shared code to core/, or export it from that module and inject it. Request schemas under dtos/ are a module's public contract and may be imported.`,
            },
          ],
        },
      ],
    },
  },
);
