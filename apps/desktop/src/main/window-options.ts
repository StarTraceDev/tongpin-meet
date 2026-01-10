export interface MainWindowOptions {
  width: number
  height: number
  minWidth: number
  minHeight: number
  show: boolean
  title: string
  titleBarStyle: 'hiddenInset' | 'default'
  frame: boolean
  backgroundColor: string
  webPreferences: {
    preload: string
    contextIsolation: boolean
    nodeIntegration: boolean
    sandbox: boolean
  }
}

/** 10-M13 §二：主窗口 1100×600 且不可再小；mac 用 hiddenInset，其他平台保留系统边框 */
export function mainWindowOptions(platform: string, preloadPath: string): MainWindowOptions {
  const mac = platform === 'darwin'
  return {
    width: 1100,
    height: 600,
    minWidth: 1100,
    minHeight: 600,
    show: false,
    title: '同频会议',
    titleBarStyle: mac ? 'hiddenInset' : 'default',
    frame: mac,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      // ESM preload 需要关 sandbox；渲染进程仍拿不到 node
      sandbox: false,
    },
  }
}
