import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'vue': resolve(__dirname, 'node_modules/vue/dist/vue.esm-bundler.js')
    }
  },
  build: {
    outDir: 'dist'
  }
});
