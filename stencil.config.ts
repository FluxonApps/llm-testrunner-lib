import { Config } from '@stencil/core';
import { reactOutputTarget } from '@stencil/react-output-target';
import path = require('path');
import * as dotenv from 'dotenv';
import replace from '@rollup/plugin-replace';

dotenv.config();

export const config: Config = {
  namespace: 'llm-testrunner',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      dir: 'dist/components',
      externalRuntime: false,
    },
    // React wrappers for unified package exports
    reactOutputTarget({
      outDir: './generated/react',
      customElementsDir: './dist/components',
      stencilPackageName: 'llm-testrunner-components',
    }),
    {
      type: 'www',
      serviceWorker: null,
    },
  ],
  testing: {
    browserHeadless: 'shell',
    moduleNameMapper: {
      // @xenova/transformers v2 is pure ESM with a known __dirname bug
      // (fixed in @huggingface/transformers v3+). Mock it for Jest/CJS compat.
      '^@xenova/transformers$': '<rootDir>/src/__mocks__/xenova-transformers.ts',
    },
  },
  sourceMap: true,
  globalScript: path.resolve(__dirname, 'src/global/env.ts'),
  rollupPlugins: {
    before: [
      replace({
        __GEMINI_API_KEY__: process.env.GEMINI_API_KEY || '',
        preventAssignment: true,
      }),
    ],
  },
};
