import { contextBridge } from 'electron'

/**
 * M10-1 只暴露只读环境信息；M10-2 再按 platform/electron 的 25 个通道补 invoke/on。
 * 渲染进程始终拿不到 ipcRenderer / node 对象。
 */
contextBridge.exposeInMainWorld('tongpin', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
})
