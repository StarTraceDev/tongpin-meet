export {}

export interface DesktopEnv {
  platform: string
  versions: { electron: string; chrome: string }
  bridge: {
    os: 'mac' | 'win' | 'linux'
    invoke: <T = undefined>(channel: string, payload?: unknown) => Promise<T>
    on: (channel: string, listener: (payload: unknown) => void) => () => void
  }
}

declare global {
  interface Window {
    tongpin?: DesktopEnv
  }
}
