interface DesktopEnv {
  platform: string
  versions: { electron: string; chrome: string }
}

const env = (globalThis as { tongpin?: DesktopEnv }).tongpin

const app = document.getElementById('app')
if (app !== null) {
  app.innerHTML = `
    <main class="shell">
      <h1>同频会议 · 桌面端</h1>
      <p class="hint">主窗口已就绪（1065 × 700）。业务界面在 M10-2 / M10-3 接 app-core。</p>
      <dl>
        <dt>平台</dt><dd>${env?.platform ?? 'unknown'}</dd>
        <dt>Electron</dt><dd>${env?.versions.electron ?? '—'}</dd>
        <dt>Chromium</dt><dd>${env?.versions.chrome ?? '—'}</dd>
      </dl>
    </main>
  `
}
