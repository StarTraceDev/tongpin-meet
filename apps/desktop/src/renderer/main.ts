import '@tongpin/tokens'

import { createElectronPlatform } from '@tongpin/platform/electron'

import type { DesktopEnv } from './env'
import { renderSubWindow } from './subwindow'
import { SUB_WINDOWS } from './subwindows'
import './shell.css'

const env = (globalThis as { tongpin?: DesktopEnv }).tongpin

function isSubWindow(): boolean {
  return new URLSearchParams(location.search).has('sub')
}

async function renderMain(): Promise<void> {
  const app = document.getElementById('app')
  if (app === null) return

  const platform = env === undefined ? undefined : createElectronPlatform(env.bridge)
  let storageNote = '—'
  if (platform !== undefined) {
    await platform.storage.set('desktop:lastOpened', new Date().toISOString())
    storageNote = (await platform.storage.get('desktop:lastOpened')) ?? '—'
  }

  const buttons = (Object.keys(SUB_WINDOWS) as (keyof typeof SUB_WINDOWS)[])
    .map((key) => `<button type="button" data-sub="${key}">${SUB_WINDOWS[key].title}</button>`)
    .join('')

  app.innerHTML = `
    <main class="shell">
      <h1>同频会议 · 桌面端</h1>
      <p class="hint">主窗口已就绪（1065 × 700），IPC 桥 ${env === undefined ? '未接通' : '已接通'}。</p>
      <dl>
        <dt>平台</dt><dd>${env?.platform ?? 'unknown'}</dd>
        <dt>Electron</dt><dd>${env?.versions.electron ?? '—'}</dd>
        <dt>Chromium</dt><dd>${env?.versions.chrome ?? '—'}</dd>
        <dt>本地存储回读</dt><dd>${storageNote}</dd>
      </dl>
      <section class="subs">
        <h2>子窗口</h2>
        <div class="row">${buttons}</div>
        <p id="sub-status" class="hint">尚未打开子窗口。</p>
      </section>
    </main>
  `

  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-sub]')) {
    button.addEventListener('click', () => {
      const key = button.dataset.sub as keyof typeof SUB_WINDOWS | undefined
      if (key === undefined || platform === undefined) return
      void platform.window.openSub(key, { title: SUB_WINDOWS[key].title })
    })
  }

  if (platform !== undefined) {
    platform.window.onSubClosed((key) => {
      const status = document.getElementById('sub-status')
      if (status !== null) status.textContent = `子窗口 ${key} 已关闭。`
    })
  }
}

if (isSubWindow()) renderSubWindow(env)
else void renderMain()
