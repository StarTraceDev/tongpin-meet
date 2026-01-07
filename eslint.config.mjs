import base from '@tongpin/config/eslint/base'

// 根目录只放 e2e 与工程配置文件；各 app / package 有各自的 eslint.config.mjs
export default [
  ...base,
  { ignores: ['**/dist/**', '**/out/**', '**/node_modules/**', '**/release/**'] },
]
