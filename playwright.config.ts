import { defineConfig, devices } from '@playwright/test'

/**
 * `reuseExistingServer` makes a preview server already on this port serve the suite — which is
 * wrong when the server belongs to another checkout or worktree, and shows up as every spec
 * failing against code that is not yours. Set E2E_PORT to get a server of your own.
 */
const port = Number(process.env.E2E_PORT ?? 4173)

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
