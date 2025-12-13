import { join } from 'node:path'

import { app, Menu, nativeImage, Tray } from 'electron'

export interface TrayOptions {
  isPackaged: boolean
  platform: NodeJS.Platform
  onShow: () => void
  onQuit: () => void
}

/** 开发态读仓库里的 resources，打包后由 electron-builder 的 extraResources 放到 Resources/tray。 */
export function trayIconPath(
  platform: NodeJS.Platform,
  isPackaged: boolean,
  resourcesPath: string,
  appPath: string,
): string {
  const directory = isPackaged ? join(resourcesPath, 'tray') : join(appPath, 'resources', 'tray')
  return join(directory, platform === 'darwin' ? 'trayTemplate.png' : 'tray.png')
}

export function createTray(options: TrayOptions): Tray {
  const image = nativeImage.createFromPath(
    trayIconPath(options.platform, options.isPackaged, process.resourcesPath, app.getAppPath()),
  )
  if (options.platform === 'darwin') image.setTemplateImage(true)

  const tray = new Tray(image)
  tray.setToolTip('同频会议')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示主窗口', click: options.onShow },
      { type: 'separator' },
      { label: '退出', click: options.onQuit },
    ]),
  )
  tray.on('click', options.onShow)
  return tray
}
