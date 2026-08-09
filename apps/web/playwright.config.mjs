// Config Playwright Atelier (apps/web) : visual regression
// Utilise le playwright installé localement dans le repo (apps/web/node_modules ou racine)
import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
  webServer: [
    {
      command: 'node ../../apps/api/dist/index.js',
      port: 4320,
      reuseExistingServer: true,
      env: { API_PORT: '4320' },
      cwd: '../../apps/api',
      timeout: 20_000,
    },
    {
      command: 'npx vite preview --port 4173',
      port: 4173,
      reuseExistingServer: true,
      cwd: '.',
      timeout: 20_000,
    },
  ],
});
