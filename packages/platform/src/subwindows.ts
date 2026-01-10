/** 10-M13 §二：子窗口唯一尺寸表，主进程开窗与渲染层都读这里 */
import type { SubWindowKey } from './types'

export interface SubWindowSpec {
  /** 窗口标题（macOS 下也用于任务切换器） */
  title: string
  width: number
  height: number
}

export const SUB_WINDOW_SPECS: Record<SubWindowKey, SubWindowSpec> = {
  join: { title: '加入会议', width: 450, height: 700 },
  schedule: { title: '预定会议', width: 450, height: 700 },
  meetingDetail: { title: '会议详情', width: 450, height: 700 },
  history: { title: '历史记录', width: 550, height: 700 },
  sharePicker: { title: '选择共享内容', width: 720, height: 560 },
  whiteboard: { title: '白板', width: 1200, height: 800 },
  checkin: { title: '签到', width: 400, height: 680 },
  vote: { title: '投票', width: 400, height: 680 },
  members: { title: '成员管理', width: 400, height: 680 },
  panelChat: { title: '聊天', width: 380, height: 680 },
  panelBreak: { title: '休息', width: 380, height: 680 },
  panelMinutes: { title: '纪要', width: 380, height: 680 },
  panelIntelligence: { title: '智能助手', width: 380, height: 680 },
  meeting: { title: '同频会议', width: 1065, height: 710 },
}

export const SUB_WINDOW_KEYS = Object.keys(SUB_WINDOW_SPECS) as SubWindowKey[]

export function isSubWindowKey(value: unknown): value is SubWindowKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SUB_WINDOW_SPECS, value)
}
