import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * prettier 的 semi:false 会把 `@click="a; b"` 拆成多行且不补分号，
 * Vue 模板只允许单个表达式，拆行后就是构建期语法错误。
 * 这里守住「内联事件里不出现换行」这条底线，改完代码不用等 CI 才发现。
 */
const ROOTS = [join(process.cwd(), 'src'), join(process.cwd(), '../../apps/desktop/src/renderer')]

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (name.endsWith('.vue')) out.push(path)
  }
}

describe('Vue 模板内联事件', () => {
  it('不在 @event 表达式里换行', () => {
    const files: string[] = []
    for (const root of ROOTS) walk(root, files)

    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (/@[a-z-]+="[^"]*\n[^"]*"/.test(source)) offenders.push(file)
    }

    expect(offenders).toEqual([])
  })
})
