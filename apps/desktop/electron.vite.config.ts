import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    // 工作区包是 TS 源码，externalize 掉 Node 跑不起来；打进 main/preload 产物
    plugins: [externalizeDepsPlugin({ exclude: ['@tongpin/platform', '@tongpin/shared'] })],
    build: {
      rollupOptions: { input: 'src/main/index.ts' },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@tongpin/platform', '@tongpin/shared'] })],
    build: {
      rollupOptions: { input: 'src/preload/index.ts' },
    },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src/renderer', import.meta.url)),
      },
      // workspace 里 app-core 与 desktop 各自声明了 vue，避免打进两份运行时
      dedupe: ['vue', 'vue-router'],
    },
    // 开发期把 /api 代理到本地网关：渲染进程与 API 同源，避免 file:// 之外的 CORS 折腾
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: { input: 'src/renderer/index.html' },
    },
  },
})
