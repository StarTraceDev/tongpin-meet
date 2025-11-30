/** 05 §3.4：preload 与主进程之间的 IPC 通道名。渲染进程永远不直接拼字符串。 */
export const ELECTRON_CHANNELS = {
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:is-maximized',
  windowSetFullscreen: 'window:set-fullscreen',
  windowOpenSub: 'window:open-sub',
  windowCloseSub: 'window:close-sub',
  windowCloseAllSubs: 'window:close-all-subs',

  capturePickSource: 'capture:pick-source',
  captureCheckPermission: 'capture:check-permission',
  captureRequestPermission: 'capture:request-permission',
  captureStop: 'capture:stop',

  storageGet: 'storage:get',
  storageSet: 'storage:set',
  storageRemove: 'storage:remove',

  updateCheck: 'update:check',
  updateInstall: 'update:install',

  notifyShow: 'notify:show',
  notifySetBadge: 'notify:set-badge',

  shellOpenExternal: 'shell:open-external',
  shellSaveFile: 'shell:save-file',

  eventMaximizedChanged: 'window:maximized-changed',
  eventSubClosed: 'window:sub-closed',
  eventUpdateState: 'update:state',
  eventNotifyClicked: 'notify:clicked',
} as const

export type ElectronChannel = (typeof ELECTRON_CHANNELS)[keyof typeof ELECTRON_CHANNELS]
