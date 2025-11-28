import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

const ENTRIES = [
  here('../index.html'),
  here('../../admin/index.html'),
  here('../../desktop/src/renderer/index.html'),
]

const scriptOf = (html: string): string => {
  const match = /<script>\s*\(function \(\) \{[\s\S]*?\}\)\(\)\s*<\/script>/.exec(html)
  return match?.[0] ?? ''
}

describe('三端防闪烁脚本', () => {
  it('每个入口都内联执行，读到 tongpin:theme 后同时写 data-theme 与 .dark', () => {
    for (const file of ENTRIES) {
      const html = readFileSync(file, 'utf8')
      const script = scriptOf(html)
      expect(script, file).toContain('tongpin:theme')
      expect(script, file).toContain('document.documentElement.dataset.theme')
      expect(script, file).toContain("classList.add('dark')")
      expect(html.indexOf(script), file).toBeLessThan(html.indexOf('<div id="app">'))
    }
  })

  it('三份脚本内容完全一致（05 §7.3 要求逐字复制）', () => {
    const [first = '', ...rest] = ENTRIES.map((file) => scriptOf(readFileSync(file, 'utf8')))
    expect(first.length).toBeGreaterThan(0)
    for (const script of rest) expect(script).toBe(first)
  })
})
