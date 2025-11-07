import node from '@tongpin/config/eslint/node'

export default [...node, { ignores: ['dist/**', 'libs/**/generated/**'] }]
