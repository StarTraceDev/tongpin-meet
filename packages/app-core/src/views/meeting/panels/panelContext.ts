import type { InjectionKey } from 'vue'

import { inject } from 'vue'

import { useMeetingStore } from '../../../stores/meeting'

/** 脱离到子窗口后，面板拿不到主窗的 meeting store，靠 payload 把 id / 主持人身份带过来 */
export interface PanelContext {
  meetingId: string
  isHost: boolean
}

export const PANEL_CONTEXT: InjectionKey<PanelContext> = Symbol('tongpin.panelContext')

export function usePanelContext(): { meetingId: () => string; isHost: () => boolean } {
  const injected = inject<PanelContext | null>(PANEL_CONTEXT, null)
  const meeting = useMeetingStore()
  return {
    meetingId: () => injected?.meetingId ?? meeting.meetingId,
    isHost: () => injected?.isHost ?? meeting.isHost,
  }
}
