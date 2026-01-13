import type { SubWindowKey } from '@tongpin/platform'

import type { IconName } from '../../../components/icons'
import type { SidePanelKey } from '../../../stores/panels'

export interface PanelSpec {
  title: string
  icon: IconName
  /** 脱离时开的子窗口（尺寸见 SUB_WINDOW_SPECS） */
  subWindow: SubWindowKey
}

/** 面板元信息：标题 / 图标 / 脱离后的子窗口 key */
export const PANEL_SPECS: Record<SidePanelKey, PanelSpec> = {
  members: { title: '成员', icon: 'users', subWindow: 'members' },
  chat: { title: '聊天', icon: 'msg', subWindow: 'panelChat' },
  minutes: { title: '纪要', icon: 'file', subWindow: 'panelMinutes' },
  intelligence: { title: '智能助手', icon: 'zap', subWindow: 'panelIntelligence' },
  break: { title: '休息', icon: 'clock', subWindow: 'panelBreak' },
  checkin: { title: '签到', icon: 'check', subWindow: 'checkin' },
  vote: { title: '投票', icon: 'check', subWindow: 'vote' },
}

/** 子窗口 key → 面板 key（脱离窗关闭后要合并回主窗） */
export const PANEL_BY_SUBWINDOW: Partial<Record<SubWindowKey, SidePanelKey>> = Object.fromEntries(
  Object.entries(PANEL_SPECS).map(([panel, spec]) => [spec.subWindow, panel as SidePanelKey]),
) as Partial<Record<SubWindowKey, SidePanelKey>>
