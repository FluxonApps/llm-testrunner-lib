import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/headless/index.ts'],
  outDir: 'dist/headless',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  dts: true,
  clean: true,
  sourcemap: true,
  outExtension: () => ({ js: '.mjs' }),
});
