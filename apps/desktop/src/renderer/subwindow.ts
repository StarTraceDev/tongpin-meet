import '@tongpin/tokens'

import { createElectronPlatform } from '@tongpin/platform/electron'

import type { DesktopEnv } from './env'
import { renderSharePicker } from './share-picker'
import { readPickerSessionId, readSubWindowRequest, SUB_WINDOWS } from './subwindows'
import './shell.css'

export function renderSubWindow(env: DesktopEnv | undefined): void {
  const request = readSubWindowRequest(location.search)
  const app = document.getElementById('app')
  if (request === null || app === null) return

  if (env !== undefined && request.key === 'sharePicker') {
    const sessionId = readPickerSessionId(request.payload)
    if (sessionId !== null) {
      const platform = createElectronPlatform(env.bridge)
      void renderSharePicker(
        app,
        {
          listSources: (id) => platform.capture.listSources(id),
          chooseSource: (id, sourceId) => platform.capture.chooseSource(id, sourceId),
          close: () => platform.window.closeSub('sharePicker'),
        },
        sessionId,
      )
      return
    }
  }

  const spec = SUB_WINDOWS[request.key]
  const payload =
    request.payload === undefined ? '（无）' : JSON.stringify(request.payload, null, 2)
  app.innerHTML = `
    <main class="sub-window">
      <header><h1>${spec.title}</h1><button id="close" type="button">关闭</button></header>
      <p class="hint">${spec.hint}</p>
      <pre id="payload"></pre>
      <footer>key: <code>${request.key}</code></footer>
    </main>
  `
  const pre = document.getElementById('payload')
  if (pre !== null) pre.textContent = payload

  document.getElementById('close')?.addEventListener('click', () => {
    if (env === undefined) {
      window.close()
      return
    }
    // 子窗口只能关自己：window:close 是关主窗口的通道
    void createElectronPlatform(env.bridge).window.closeSub(request.key)
  })
}
