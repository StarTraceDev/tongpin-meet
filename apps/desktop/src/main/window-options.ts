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

/** 06 §M10-1：1065×700 且不可再小；mac 用 hiddenInset，其他平台无边框自绘 */
export function mainWindowOptions(platform: string, preloadPath: string): MainWindowOptions {
  const mac = platform === 'darwin'
  return {
    width: 1065,
    height: 700,
    minWidth: 1065,
    minHeight: 700,
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
