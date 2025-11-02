import prettier from 'eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

import base from './base.mjs';

// .vue 的类型感知 lint：顶层 parser 必须是 vue-eslint-parser，
// TS 解析器只能挂在 parserOptions.parser 上，否则两者抢 parser 直接报错
export default [
  ...base,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  // 必须放最后：pluginVue 的格式类规则会覆盖 base 里已关掉的项
  prettier,
];
