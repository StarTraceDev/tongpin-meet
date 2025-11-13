import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// Nest 的 DI 依赖 emitDecoratorMetadata，esbuild 不产这份元数据，所以用 swc 转译
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: 'node',
    include: ['{apps,libs}/**/*.spec.ts'],
    // PrismaService 构造时要求 DATABASE_URL；测试不查库，给个不会被连的占位值
    env: {
      DATABASE_URL: 'postgresql://prisma:prisma@127.0.0.1:5432/tongpin_test',
      // AuthModule 初始化时校验 JWT_SECRET 长度，测试给个 40 位假值
      JWT_SECRET: 'vitest-only-secret-please-do-not-use-in-prod',
    },
  },
})
