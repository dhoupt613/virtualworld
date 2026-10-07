import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './hosting-tests',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5175/virtualworld/',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5175 --strictPort --base /virtualworld/',
    url: 'http://127.0.0.1:5175/virtualworld/',
    reuseExistingServer: false,
  },
});
