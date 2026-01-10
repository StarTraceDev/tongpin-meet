import type { SubWindowRequest } from '@tongpin/app-core'
import { isSubWindowKey } from '@tongpin/platform'

/**
 * `?sub=join&payload=<json>` → 结构化请求（10-M13 O2）。
 * 坏 payload 仍返回 key：面板自己决定要不要提示，不让整个窗口退化成主界面。
 */
export function readSubWindowRequest(search: string): SubWindowRequest | null {
  const params = new URLSearchParams(search)
  const key = params.get('sub')
  if (key === null || !isSubWindowKey(key)) return null

  const raw = params.get('payload')
  if (raw === null) return { key }

  try {
    return { key, payload: JSON.parse(raw) as unknown }
  } catch {
    return { key }
  }
}
