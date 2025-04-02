// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    // Ensure all paths redirect to index.html for SPA routing
    historyApiFallback: true,
    rewrites: [
      {
        from: /\/.*/,
        to: '/index.html'
      }
    ]
  }
});