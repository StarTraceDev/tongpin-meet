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

function asButton(id: string): HTMLButtonElement | null {
  const element = document.getElementById(id)
  return element instanceof HTMLButtonElement ? element : null
}

function asVideo(id: string): HTMLVideoElement | null {
  const element = document.getElementById(id)
  return element instanceof HTMLVideoElement ? element : null
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
      <section class="share">
        <h2>屏幕共享</h2>
        <div class="row">
          <button id="share-start" type="button">共享屏幕</button>
          <button id="share-stop" type="button" disabled>停止共享</button>
        </div>
        <p id="share-status" class="hint">未共享。</p>
        <video id="share-preview" class="share-preview" autoplay muted playsinline hidden></video>
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

  if (platform === undefined) return

  platform.window.onSubClosed((key) => {
    const status = document.getElementById('sub-status')
    if (status !== null) status.textContent = `子窗口 ${key} 已关闭。`
  })

  const startButton = asButton('share-start')
  const stopButton = asButton('share-stop')
  const status = document.getElementById('share-status')
  const preview = asVideo('share-preview')

  const setSharing = (on: boolean): void => {
    if (startButton !== null) startButton.disabled = on
    if (stopButton !== null) stopButton.disabled = !on
  }

  startButton?.addEventListener('click', () => {
    void (async (): Promise<void> => {
      if (status !== null) status.textContent = '请选择要共享的屏幕或窗口…'
      try {
        const source = await platform.capture.pickSource()
        if (source === null) {
          if (status !== null) status.textContent = '未选择共享内容。'
          return
        }
        if (status !== null) status.textContent = `正在共享：${source.name}`
        if (preview !== null && source.stream !== undefined) {
          preview.srcObject = source.stream
          preview.hidden = false
        }
        setSharing(true)
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        if (status !== null) status.textContent = `共享失败：${message}`
      }
    })()
  })

  stopButton?.addEventListener('click', () => {
    void (async (): Promise<void> => {
      await platform.capture.stop()
      if (preview !== null) {
        preview.srcObject = null
        preview.hidden = true
      }
      if (status !== null) status.textContent = '已停止共享。'
      setSharing(false)
    })()
  })
}

if (isSubWindow()) renderSubWindow(env)
else void renderMain()
