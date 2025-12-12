import type { SubWindowKey } from '@tongpin/platform'

export interface SubWindowSpec {
  title: string
  hint: string
}

/** 10.3：窗口池里的四个 key；标题同时给主进程开窗与渲染层用。 */
export const SUB_WINDOWS: Record<SubWindowKey, SubWindowSpec> = {
  join: { title: '加入会议', hint: '输入会议号与昵称，或等待主窗口带着会议上下文打开。' },
  schedule: { title: '预定会议', hint: '填标题、时间与参会人；保存后主窗口列表会刷新。' },
  sharePicker: {
    title: '选择共享内容',
    hint: '整屏 / 窗口，缩略图来自 desktopCapturer；选中后回到主窗口开始共享。',
  },
  whiteboard: { title: '白板', hint: '会中白板独立窗口，尺寸可拉大。' },
}

export interface SubWindowRequest {
  key: SubWindowKey
  payload: unknown
}

function isSubWindowKey(value: string): value is SubWindowKey {
  return Object.prototype.hasOwnProperty.call(SUB_WINDOWS, value)
}

/** 共享选择器开窗时主进程塞的 `{ sessionId }`；不是合法会话就退回通用子窗口。 */
export function readPickerSessionId(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') return null
  const { sessionId } = payload as { sessionId?: unknown }
  return typeof sessionId === 'string' && sessionId !== '' ? sessionId : null
}

/** 从 `?sub=key&payload=<json>` 解析子窗口请求；非法 key 或坏 JSON 都返回 null。 */
export function readSubWindowRequest(search: string): SubWindowRequest | null {
  const params = new URLSearchParams(search)
  const key = params.get('sub')
  if (key === null || !isSubWindowKey(key)) return null
  const raw = params.get('payload')
  if (raw === null) return { key, payload: undefined }
  try {
    return { key, payload: JSON.parse(raw) as unknown }
  } catch {
    return { key, payload: undefined }
  }
}
