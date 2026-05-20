import { defineConfig } from 'tsup';
import { resolve } from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      '@gamehub/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@gamehub/r2-client': resolve(__dirname, '../../packages/r2-client/src/index.ts'),
    };
  },
});
