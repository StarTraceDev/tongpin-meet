export {}

declare global {
  interface Window {
    tongpin?: {
      platform: string
      versions: { electron: string; chrome: string }
    }
  }
}
