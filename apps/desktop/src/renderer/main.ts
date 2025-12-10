import { createElectronPlatform } from '@tongpin/platform/electron'

interface DesktopEnv {
  platform: string
  versions: { electron: string; chrome: string }
  bridge: Parameters<typeof createElectronPlatform>[0]
}

const env = (globalThis as { tongpin?: DesktopEnv }).tongpin
const app = document.getElementById('app')

async function render(): Promise<void> {
  if (app === null) return
  let storageNote = '—'
  if (env !== undefined) {
    const platform = createElectronPlatform(env.bridge)
    await platform.storage.set('desktop:lastOpened', new Date().toISOString())
    storageNote = (await platform.storage.get('desktop:lastOpened')) ?? '—'
  }
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
    </main>
  `
}

void render()
