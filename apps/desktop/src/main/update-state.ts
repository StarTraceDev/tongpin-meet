import type { UpdateState } from '@tongpin/platform'

/** electron-updater 的事件被收窄成这几种，映射逻辑保持纯函数，便于单测。 */
export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export function mapUpdateEvent(event: UpdateEvent): UpdateState {
  switch (event.type) {
    case 'checking':
      return { status: 'checking' }
    case 'available':
      return { status: 'available', version: event.version }
    case 'not-available':
      return { status: 'idle' }
    case 'progress':
      return {
        status: 'downloading',
        progress: Math.min(100, Math.max(0, Math.round(event.percent))),
      }
    case 'downloaded':
      return { status: 'ready', version: event.version }
    case 'error':
      return { status: 'error', error: event.message }
  }
}
