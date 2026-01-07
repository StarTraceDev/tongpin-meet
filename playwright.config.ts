import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'

/**
 * 冒烟只打接口，不启动浏览器：server 需要先起好并连上 PostgreSQL。
 * 本地：pnpm --filter @tongpin/server dev；CI 由 workflow 起服务后跑 pnpm test:e2e。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    extraHTTPHeaders: { 'content-type': 'application/json' },
  },
})
