/**
 * 极简 markdown → HTML：只覆盖纪要/智能助手用到的标题、列表、加粗。
 * 先转义再加标记，避免把模型输出当 HTML 执行。
 */
export function renderMarkdown(source: string): string {
  const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const blocks: string[] = []
  let list: string[] = []

  const flush = (): void => {
    if (list.length > 0) {
      blocks.push(`<ul>${list.join('')}</ul>`)
      list = []
    }
  }

  for (const raw of escaped.split('\n')) {
    const line = raw.trim()
    if (line === '') {
      flush()
      continue
    }
    if (line.startsWith('### ')) {
      flush()
      blocks.push(`<h4>${inline(line.slice(4))}</h4>`)
      continue
    }
    if (line.startsWith('## ')) {
      flush()
      blocks.push(`<h3>${inline(line.slice(3))}</h3>`)
      continue
    }
    if (line.startsWith('- ') || line.startsWith('· ')) {
      list.push(`<li>${inline(line.slice(2))}</li>`)
      continue
    }
    const ordered = /^(\d+)[.、]\s*(.+)$/.exec(line)
    if (ordered !== null) {
      list.push(`<li>${inline(ordered[2] ?? '')}</li>`)
      continue
    }
    flush()
    blocks.push(`<p>${inline(line)}</p>`)
  }
  flush()
  return blocks.join('')
}

function inline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}
