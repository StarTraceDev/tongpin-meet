import type { DeptNode } from '@tongpin/shared'

export interface DeptOption {
  value: string
  title: string
  children: DeptOption[]
}

/** AntD TreeSelect 的树形数据；标题带上层级缩进前的名字即可 */
export function toDeptOptions(nodes: readonly DeptNode[]): DeptOption[] {
  return nodes.map((node) => ({
    value: node.id,
    title: node.name,
    children: toDeptOptions(node.children),
  }))
}

/** 表格里展示「父部门 / 子部门」时用的扁平列表，depth 供缩进 */
export function flattenDepts(nodes: readonly DeptNode[]): { node: DeptNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth: 0 }, ...descend(node.children, 1)])
}

function descend(nodes: readonly DeptNode[], depth: number): { node: DeptNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth }, ...descend(node.children, depth + 1)])
}

export function deptNamePath(nodes: readonly DeptNode[], id: string | null): string {
  if (id === null) return ''
  for (const { node } of flattenDepts(nodes)) {
    if (node.id === id) return node.name
  }
  return ''
}

/** 默认展开所有有子部门的节点；AntD 的 defaultExpandAllRows 在异步加载后不生效 */
export function expandableIds(nodes: readonly DeptNode[]): string[] {
  return nodes.flatMap((node) =>
    node.children.length === 0 ? [] : [node.id, ...expandableIds(node.children)],
  )
}
