import { randomUUID } from 'node:crypto'

import type { CaptureSourceListing } from '@tongpin/platform'

import { toCaptureListings, type DesktopSourceLike } from './sources'

/** 选中的源只保留给紧接着的那一次 getDisplayMedia，过期作废 */
const SELECTION_TTL_MS = 60_000
/** 用户把选择器晾着不管时，不能让业务一直 await */
const PICK_TIMEOUT_MS = 120_000

export interface SourcePickerOptions {
  listSources: () => Promise<readonly DesktopSourceLike[]>
  /** 打开 sharePicker 子窗口（payload 里带 sessionId） */
  openPicker: (sessionId: string) => void
  /** 关闭 sharePicker 子窗口；用户取消/超时时由主进程主动关 */
  closePicker: () => void
  timeoutMs?: number
  selectionTtlMs?: number
  createSessionId?: () => string
  now?: () => number
}

interface PendingPick {
  sessionId: string
  ownerId: number
  listings: CaptureSourceListing[]
  resolve: (listing: CaptureSourceListing | null) => void
  timer: NodeJS.Timeout
}

export interface SelectedSource {
  id: string
  name: string
}

/**
 * 10.4：一次只允许一个选择会话。渲染进程先经 `capture:pick-source` 打开窗口，
 * 选择器窗口再用 sessionId 拉列表、回传结果；主进程把结果暂存，等下一次
 * `getDisplayMedia` 时交给 setDisplayMediaRequestHandler 消费。
 */
export class SourcePicker {
  private pending: PendingPick | null = null
  private readonly selected = new Map<number, SelectedSource & { expiresAt: number }>()
  private readonly timeoutMs: number
  private readonly selectionTtlMs: number
  private readonly now: () => number
  private readonly createSessionId: () => string

  constructor(private readonly options: SourcePickerOptions) {
    this.timeoutMs = options.timeoutMs ?? PICK_TIMEOUT_MS
    this.selectionTtlMs = options.selectionTtlMs ?? SELECTION_TTL_MS
    this.now = options.now ?? Date.now
    this.createSessionId = options.createSessionId ?? randomUUID
  }

  /** ownerId 是发起共享的 webContents id，只允许它消费自己选中的源 */
  async pick(ownerId: number): Promise<CaptureSourceListing | null> {
    if (this.pending !== null) return null

    const sources = await this.options.listSources()
    if (sources.length === 0) return null

    const sessionId = this.createSessionId()
    let resolve: (listing: CaptureSourceListing | null) => void = () => undefined
    const result = new Promise<CaptureSourceListing | null>((done) => {
      resolve = done
    })
    const timer = setTimeout(() => this.cancel(), this.timeoutMs)
    this.pending = {
      sessionId,
      ownerId,
      listings: toCaptureListings(sources),
      resolve,
      timer,
    }
    this.options.openPicker(sessionId)
    return result
  }

  /** 选择器窗口拉候选列表；sessionId 不对（过期/被替换）返回 null */
  list(sessionId: string): CaptureSourceListing[] | null {
    if (this.pending === null || this.pending.sessionId !== sessionId) return null
    return this.pending.listings
  }

  /** 返回 false 表示 sessionId 已失效，调用方不需要再处理 */
  settle(sessionId: string, sourceId: string | null): boolean {
    const pending = this.pending
    if (pending === null || pending.sessionId !== sessionId) return false
    const listing = sourceId === null ? null : pending.listings.find((item) => item.id === sourceId)
    this.finish(listing ?? null, false)
    return true
  }

  /** 用户直接关窗或超时：resolves null，并确保窗口收掉 */
  cancel(): void {
    this.finish(null, true)
  }

  /** 一次 getDisplayMedia 只能消费一次；过期或 owner 不匹配都拿不到 */
  takeSelected(ownerId: number): SelectedSource | null {
    const chosen = this.selected.get(ownerId)
    if (chosen === undefined) return null
    this.selected.delete(ownerId)
    if (chosen.expiresAt < this.now()) return null
    return { id: chosen.id, name: chosen.name }
  }

  /** 停止共享时清掉尚未消费的选择，并取消当前选择器 */
  release(ownerId: number): void {
    this.selected.delete(ownerId)
    if (this.pending !== null && this.pending.ownerId === ownerId) this.cancel()
  }

  private finish(listing: CaptureSourceListing | null, closeWindow: boolean): void {
    const pending = this.pending
    if (pending === null) return
    this.pending = null
    clearTimeout(pending.timer)
    if (listing !== null) {
      this.selected.set(pending.ownerId, {
        id: listing.id,
        name: listing.name,
        expiresAt: this.now() + this.selectionTtlMs,
      })
    } else {
      this.selected.delete(pending.ownerId)
    }
    if (closeWindow) this.options.closePicker()
    pending.resolve(listing)
  }
}
