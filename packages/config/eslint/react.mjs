import prettier from 'eslint-config-prettier'
import globals from 'globals'

import base from './base.mjs'

// 管理台跑在浏览器里，且 .tsx 需要 JSX 解析；其余规则与 base 一致
export default [
  ...base,
  {
    files: ['**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  // 必须放最后：关掉所有与 prettier 冲突的格式类规则
  prettier,
]
