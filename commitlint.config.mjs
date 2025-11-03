const TYPES = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore']

// 07 §10.2：scope 必填且只能用这 12 个
const SCOPES = [
  'web',
  'desktop',
  'admin',
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
