import type { CaptureSourceListing } from '@tongpin/platform'

export interface SharePickerDeps {
  listSources(sessionId: string): Promise<CaptureSourceListing[] | null>
  chooseSource(sessionId: string, sourceId: string | null): Promise<void>
  close(): Promise<void>
}

function sourceKindLabel(kind: CaptureSourceListing['kind']): string {
  return kind === 'screen' ? '整个屏幕' : '窗口'
}

function createSourceCard(listing: CaptureSourceListing, onPick: () => void): HTMLButtonElement {
  const card = document.createElement('button')
  card.type = 'button'
  card.className = 'source-card'
  card.dataset.sourceId = listing.id
  card.setAttribute('role', 'option')
  card.setAttribute('aria-selected', 'false')

  const thumbnail = document.createElement('img')
  thumbnail.src = listing.thumbnail
  thumbnail.alt = ''
  thumbnail.decoding = 'async'

  const name = document.createElement('span')
  name.className = 'source-name'
  name.textContent = listing.name

  const kind = document.createElement('span')
  kind.className = 'source-kind'
  kind.textContent = sourceKindLabel(listing.kind)

  card.append(thumbnail, name, kind)
  card.addEventListener('click', () => {
    card.setAttribute('aria-selected', 'true')
    onPick()
  })
  return card
}

/**
 * 10.4：共享选择器窗口。列表来自 desktopCapturer（缩略图 data URL），
 * 选中后把 sessionId + sourceId 交回主进程，由 setDisplayMediaRequestHandler 兑换成流。
 */
export async function renderSharePicker(
  root: HTMLElement,
  deps: SharePickerDeps,
  sessionId: string,
): Promise<void> {
  root.innerHTML = `
    <main class="sub-window">
      <header>
        <h1>选择共享内容</h1>
        <button id="pick-cancel" type="button">取消</button>
      </header>
      <p class="hint">选中后回到主窗口开始共享，Esc 或「取消」放弃本次共享。</p>
      <div id="source-grid" class="source-grid" role="listbox" aria-label="可共享的屏幕与窗口"></div>
      <p id="picker-status" class="hint" role="status"></p>
    </main>
  `

  const grid = document.getElementById('source-grid')
  const status = document.getElementById('picker-status')
  let settled = false

  const finish = async (sourceId: string | null): Promise<void> => {
    if (settled) return
    settled = true
    await deps.chooseSource(sessionId, sourceId)
    await deps.close()
  }

  document.getElementById('pick-cancel')?.addEventListener('click', () => void finish(null))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') void finish(null)
  })

  let listings: CaptureSourceListing[] | null
  try {
    listings = await deps.listSources(sessionId)
  } catch {
    if (status !== null) status.textContent = '读取共享源失败，请关闭后重试。'
    return
  }

  if (listings === null || listings.length === 0) {
    if (status !== null) status.textContent = '没有可共享的屏幕或窗口。'
    return
  }

  if (status !== null) status.textContent = `共 ${listings.length} 个可共享源，选择后开始共享。`
  for (const listing of listings) {
    grid?.append(createSourceCard(listing, () => void finish(listing.id)))
  }
}
