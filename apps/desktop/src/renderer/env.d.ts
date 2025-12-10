export {}

declare global {
  interface Window {
    tongpin?: {
      platform: string
      versions: { electron: string; chrome: string }
      bridge: {
        os: string
        invoke: (channel: string, payload?: unknown) => Promise<unknown>
        on: (channel: string, listener: (payload: unknown) => void) => () => void
      }
    }
  }
}
