import type { SubWindowKey } from '@tongpin/platform'

import type { IconName } from '../../../components/icons'
import type { SidePanelKey } from '../../../stores/panels'

export interface PanelSpec {
  title: string
  icon: IconName
  /** 停靠时的宽度：聊天按 D18 是 380，其余按 D15 是 400 */
  width: number
  /** 脱离时开的子窗口（尺寸见 SUB_WINDOW_SPECS） */
  subWindow: SubWindowKey | null
  /** 子窗口标题居中（D21/D27 的签到、投票是居中标题） */
  centered?: boolean
}

/** 面板元信息：标题 / 图标 / 脱离后的子窗口 key */
export const PANEL_SPECS: Record<SidePanelKey, PanelSpec> = {
  members: { title: '成员', icon: 'users', width: 400, subWindow: 'members' },
  chat: { title: '聊天', icon: 'msg', width: 380, subWindow: 'panelChat' },
  minutes: { title: '会议纪要', icon: 'file', width: 380, subWindow: 'panelMinutes' },
  intelligence: { title: '智能助手', icon: 'sparkle', width: 380, subWindow: 'panelIntelligence' },
  break: { title: '休息', icon: 'clock', width: 380, subWindow: 'panelBreak' },
  checkin: { title: '签到', icon: 'check', width: 400, subWindow: 'checkin', centered: true },
  vote: { title: '投票', icon: 'check', width: 400, subWindow: 'vote', centered: true },
  files: { title: '文件', icon: 'file', width: 380, subWindow: null },
}

/** 子窗口 key → 面板 key（脱离窗关闭后要合并回主窗） */
export const PANEL_BY_SUBWINDOW: Partial<Record<SubWindowKey, SidePanelKey>> = Object.fromEntries(
  Object.entries(PANEL_SPECS)
    .filter(([, spec]) => spec.subWindow !== null)
    .map(([panel, spec]) => [spec.subWindow, panel as SidePanelKey]),
) as Partial<Record<SubWindowKey, SidePanelKey>>
