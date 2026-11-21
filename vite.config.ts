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
      output: {
        manualChunks: {
          leaflet: ['leaflet'],
          html2canvas: ['html2canvas'],
        },
      },
    },
  },
});
