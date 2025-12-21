import { describe, expect, it } from 'vitest'

import type { DeptNode } from '@tongpin/shared'

import { deptNamePath, expandableIds, flattenDepts, toDeptOptions } from './tree'

const tree: DeptNode[] = [
  {
    id: 'd_1',
    name: '产品部',
    parentId: null,
    sort: 1,
    children: [
      { id: 'd_2', name: '设计组', parentId: 'd_1', sort: 1, children: [] },
      { id: 'd_3', name: '研发组', parentId: 'd_1', sort: 2, children: [] },
    ],
  },
]

describe('toDeptOptions', () => {
  it('保留层级结构', () => {
    expect(toDeptOptions(tree)).toEqual([
      {
        value: 'd_1',
        title: '产品部',
        children: [
          { value: 'd_2', title: '设计组', children: [] },
          { value: 'd_3', title: '研发组', children: [] },
        ],
      },
    ])
  })
})

describe('flattenDepts', () => {
  it('先序遍历并带层级', () => {
    expect(flattenDepts(tree).map(({ node, depth }) => `${node.name}:${depth}`)).toEqual([
      '产品部:0',
      '设计组:1',
      '研发组:1',
    ])
  })
})

describe('deptNamePath', () => {
  it('找到名字，空 id 给空串', () => {
    expect(deptNamePath(tree, 'd_3')).toBe('研发组')
    expect(deptNamePath(tree, null)).toBe('')
    expect(deptNamePath(tree, 'd_x')).toBe('')
  })
})

describe('expandableIds', () => {
  it('只收有子部门的节点', () => {
    expect(expandableIds(tree)).toEqual(['d_1'])
    expect(expandableIds([])).toEqual([])
  })
})
