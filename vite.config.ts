import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    commonjsOptions: {
      include: [/searoute-ts/, /node_modules/],
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        guide: resolve(__dirname, 'guide.html'),
        architecture: resolve(__dirname, 'architecture.html'),
      },
      output: {
        manualChunks: {
          leaflet: ['leaflet'],
          html2canvas: ['html2canvas'],
        },
      },
    },
  },
});
