import { defineConfig, devices } from '@playwright/test'

const webBase = process.env.E2E_WEB_URL ?? 'http://localhost:4174'
const port = new URL(webBase).port

/**
 * UI 级冒烟：真浏览器打 Web 端（Vite dev server + /api 反代到 3000）。
 * API 服务需要先在 3000 起好；Web 端由 webServer 自动拉起。
 * 对应 PROGRESS §5 #27 的「UI 级冒烟」缺口。
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/ui-smoke.spec.ts'],
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: webBase,
    ...devices['Desktop Chrome'],
    // 本机没有 Playwright 自带浏览器时可直接用系统 Chrome：E2E_BROWSER_CHANNEL=chrome
    channel: process.env.E2E_BROWSER_CHANNEL,
  },
  webServer: {
    command: `pnpm --filter @tongpin/web exec vite --port ${port} --strictPort`,
    url: webBase,
    reuseExistingServer: process.env.CI === undefined || process.env.CI === '',
    timeout: 120_000,
  },
})
