/**
 * 全仓共用的 prettier 配置。
 * 02 §2.5：模板里 @click 写多条语句时，no-semi 会拆行导致模板解析错误，所以不写分号。
 *
 * @type {import('prettier').Config}
 */
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  endOfLine: 'lf',
  vueIndentScriptAndStyle: false,
};
