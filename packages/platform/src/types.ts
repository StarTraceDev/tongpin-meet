/** 05 §3.4：业务代码只允许 import 这一个包，禁止直接碰 window.api / window.electron */

export type PlatformKind = 'web' | 'electron'
export type PlatformOs = 'mac' | 'win' | 'linux' | 'web'

export interface Platform {
  readonly kind: PlatformKind
  readonly os: PlatformOs

  window: WindowPort
  capture: CapturePort
  storage: StoragePort
  update: UpdatePort
  notify: NotifyPort
  shell: ShellPort
}

/** 子窗口种类：入会 / 预定 / 共享选择器 / 白板（05 §3.5） */
export type SubWindowKey = 'join' | 'schedule' | 'sharePicker' | 'whiteboard'

export interface SubWindowOptions {
  title?: string
  width?: number
  height?: number
  /** 透传给子窗口初始化参数，壳自己解释 */
  payload?: unknown
}

export interface WindowPort {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
  isMaximized(): Promise<boolean>
  setFullscreen(on: boolean): Promise<void>
  onMaximizedChange(cb: (value: boolean) => void): () => void

  /** Web 端实现为覆盖层路由，返回同样的 key；业务代码不区分 */
  openSub(key: SubWindowKey, opts: SubWindowOptions): Promise<void>
  closeSub(key: SubWindowKey): Promise<void>
  closeAllSubs(): Promise<void>
  onSubClosed(cb: (key: SubWindowKey) => void): () => void

  /** 会中面板展开时是否允许改变窗口宽度（Web 恒 false） */
  readonly canResizeForPanel: boolean
}

export type CaptureSourceKind = 'screen' | 'window'

export interface CaptureSource {
  id: string
  name: string
  kind: CaptureSourceKind
  /** Web 端由 getDisplayMedia 直接给流；Electron 端由 desktopCapturer 选源后另取流 */
  stream?: MediaStream
}

export interface CapturePort {
  /** Electron: desktopCapturer 自定义选择器；Web: 直接调 getDisplayMedia（系统选择器） */
  pickSource(): Promise<CaptureSource | null>
  checkPermission(): Promise<'granted' | 'denied' | 'unknown'>
  requestPermission(): Promise<boolean>
  stop(): Promise<void>
}

export interface StoragePort {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  /** Electron 用 safeStorage 加密 refresh token；Web 用 localStorage（并说明风险） */
  readonly secure: boolean
}

export type UpdateStatus =
  'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'unsupported' | 'error'

export interface UpdateState {
  status: UpdateStatus
  version?: string
  /** 0-100 */
  progress?: number
  error?: string
}

export interface UpdatePort {
  readonly supported: boolean
  check(): Promise<UpdateState>
  install(): Promise<void>
  onState(cb: (state: UpdateState) => void): () => void
}

export interface NotifyOptions {
  title: string
  body: string
  onClick?: () => void
}

export interface NotifyPort {
  show(opts: NotifyOptions): Promise<void>
  setBadge(count: number): Promise<void>
}

export interface ShellPort {
  openExternal(url: string): Promise<void>
  saveFile(opts: { filename: string; blob: Blob }): Promise<void>
}
