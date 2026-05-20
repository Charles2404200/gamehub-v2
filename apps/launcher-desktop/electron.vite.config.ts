import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@gamehub/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
        '@gamehub/installer': path.resolve(__dirname, '../../packages/installer/src/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@gamehub/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
        '@': path.resolve(__dirname, './src/renderer/src'),
      },
    },
    plugins: [react()],
  },
});
