import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiPort = process.env.VITE_API_PORT || '4310';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
      '/b': `http://localhost:${apiPort}`
    }
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
      '/b': `http://localhost:${apiPort}`
    }
  }
});
