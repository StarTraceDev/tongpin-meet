import { existsSync } from 'node:fs'

import { defineConfig, env } from 'prisma/config'

// Prisma 7 不再自动加载 .env，用 Node 内置能力补（生产直接给进程环境）
if (existsSync('.env')) process.loadEnvFile()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
  migrations: { path: 'prisma/migrations' },
})
