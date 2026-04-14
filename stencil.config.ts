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
      copy: [{ src: 'demo', dest: 'demo' }],
    },
  ],
  testing: {
    browserHeadless: 'shell',
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
