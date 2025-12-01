const TYPES = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore']

// 07 §10.2 的 12 个 + app-core（09 新增包，见 PROGRESS §5）
const SCOPES = [
  'web',
  'desktop',
  'admin',
  'app-core',
  'server',
  'shared',
  'platform',
  'tokens',
  'theme',
  'deps',
  'ci',
  'docs',
  'deploy',
]

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', TYPES],
    'scope-enum': [2, 'always', SCOPES],
    'scope-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'header-max-length': [2, 'always', 100],
  },
}
