import { describe, expect, it } from 'vitest'

import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('把二级标题和列表转成标题与 ul/li', () => {
    const html = renderMarkdown('## 一、复盘结论\n- 达成率 92%\n- 缺口在华东')

    expect(html).toContain('<h3>一、复盘结论</h3>')
    expect(html).toContain('<li>达成率 92%</li>')
    expect(html).toContain('<li>缺口在华东</li>')
  })

  it('加粗与有序列表都能识别', () => {
    const html = renderMarkdown('**重点**\n1. 第一条\n2. 第二条')

    expect(html).toContain('<strong>重点</strong>')
    expect(html).toContain('<li>第一条</li>')
  })

  it('转义 HTML，避免模型输出被当成标签执行', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>')

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})
