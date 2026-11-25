import path from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const contractsSrc = path.resolve(__dirname, '../packages/contracts/src');

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: [
      // Resolve @nexus/contracts to its TypeScript source rather than its built
      // output. The package ships both an ESM and a CommonJS build, and Vite
      // picks the ESM one, which pulls in a second copy of @nestjs/common. Two
      // copies mean two HttpException classes, so a BadRequestException raised
      // by a validation pipe from one copy fails the `instanceof` check in the
      // other copy's exception handler and is served as 500 instead of 400.
      // Compiling the source in this same graph keeps a single copy.
      { find: /^@nexus\/contracts\/nest$/, replacement: path.join(contractsSrc, 'nest/index.ts') },
      { find: /^@nexus\/contracts$/, replacement: path.join(contractsSrc, 'index.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    root: './',
    setupFiles: ['./test/vitest.setup.ts'],
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts', 'src/main.ts', 'src/scripts/**'],
    },
  },
});
