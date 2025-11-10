import node from '@tongpin/config/eslint/node'

export default [
  ...node,
  { ignores: ['dist/**', 'libs/**/generated/**'] },
  // 种子脚本是 CLI，输出就是给人看的，允许 console；其余服务端代码仍禁
  { files: ['prisma/**/*.ts'], rules: { 'no-console': 'off' } },
]
