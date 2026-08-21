import { defineConfig, devices } from '@playwright/test'

const API_PORT = 8000
const WEB_PORT = 4173
const API_URL = `http://127.0.0.1:${API_PORT}`
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`

// Locally the DB is reached on 55432 (see the toolchain notes); CI uses 5432.
const DB_PORT = process.env.E2E_DB_PORT ?? '55432'
const PHP = process.env.E2E_PHP ?? 'php'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      // Fresh, seeded API on a throwaway migration so the apply + stage-move flows have data.
      command: `${PHP} artisan migrate:fresh --seed --seeder=DemoSeeder --force && ${PHP} artisan serve --host=127.0.0.1 --port=${API_PORT}`,
      cwd: 'apps/api',
      url: `${API_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Allow the preview origin through CORS so the SPA can call the API.
      env: { DB_PORT, APP_ENV: 'local', FRONTEND_URL: WEB_URL, SANCTUM_STATEFUL_DOMAINS: `127.0.0.1:${WEB_PORT}` },
    },
    {
      // The build is done up front (see the e2e npm script / CI) so this only serves it.
      // Host/port/strictPort come from vite's preview config, which binds 127.0.0.1 reliably.
      command: `pnpm --filter web run preview`,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_API_URL: `${API_URL}/api` },
    },
  ],
})
