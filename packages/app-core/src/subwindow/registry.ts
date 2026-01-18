import type { SubWindowKey } from '@tongpin/platform'
import type { Component } from 'vue'

import MeetingRoom from '../views/meeting/MeetingRoom.vue'
import JoinMeeting from './JoinMeeting.vue'
import PanelWindow from './PanelWindow.vue'
import PendingPanel from './PendingPanel.vue'
import WhiteboardWindow from './WhiteboardWindow.vue'

/**
 * key → 组件（10-M13 O2/O16）。壳可以覆盖任意项（共享选择器只有 Electron 实现）；
 * 还没迁移的面板统一落到 PendingPanel，不出现“空白窗”。
 */
const PANELS: Partial<Record<SubWindowKey, Component>> = {
  join: JoinMeeting,
  meeting: MeetingRoom,
  whiteboard: WhiteboardWindow,
  members: PanelWindow,
  panelChat: PanelWindow,
  panelMinutes: PanelWindow,
  panelIntelligence: PanelWindow,
  panelBreak: PanelWindow,
  checkin: PanelWindow,
  vote: PanelWindow,
}

export function resolveSubWindowComponent(
  key: SubWindowKey,
  overrides?: Partial<Record<SubWindowKey, Component>>,
): Component {
  return overrides?.[key] ?? PANELS[key] ?? PendingPanel
}
