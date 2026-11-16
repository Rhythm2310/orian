import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, 'client'),
  base: './',
  plugins: [svelte({
    onwarn: (warning, handler) => {
      // Suppress minor a11y warnings during build
      if (warning.code.startsWith('a11y_')) return;
      handler(warning);
    }
  })],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@db': path.resolve(__dirname, 'src/db')
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    target: 'esnext'
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
