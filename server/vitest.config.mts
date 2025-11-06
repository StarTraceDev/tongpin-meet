import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// Nest 的 DI 依赖 emitDecoratorMetadata，esbuild 不产这份元数据，所以用 swc 转译
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: 'node',
    include: ['{apps,libs}/**/*.spec.ts'],
  },
})
