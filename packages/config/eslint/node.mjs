import globals from 'globals';

import base from './base.mjs';

// 后端与构建脚本：Node 全局变量
export default [
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
