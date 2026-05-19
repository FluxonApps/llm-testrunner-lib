import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/headless/index.ts',
    'jest-setup': 'src/headless/jest-setup.ts',
  },
  outDir: 'dist/headless',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  dts: true,
  clean: true,
  sourcemap: true,
  outExtension: () => ({ js: '.mjs' }),
  external: ['@jest/globals'],
});
