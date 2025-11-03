export default {
  // 只对 TS / Vue 跑 eslint，命中包内各自的 eslint.config.mjs
  '*.{ts,tsx,vue}': ['eslint --fix', 'prettier --write'],
  '*.{js,mjs,cjs,json,yml,yaml,md}': 'prettier --write',
}
