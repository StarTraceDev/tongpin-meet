import { Injectable } from '@nestjs/common'

/** 07 §310：创建类 POST 支持 Idempotency-Key，24h 内重复请求返回同一结果 */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

interface Entry {
  expiresAt: number
  value: unknown
}

/**
 * 进程内幂等缓存。多实例部署会失效，M8 切 Redis 时把 get/put 换掉即可，
 * 调用方只依赖这两个方法，不用改业务代码。
 */
@Injectable()
export class IdempotencyService {
  private readonly entries = new Map<string, Entry>()

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (entry === undefined) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value as T
  }

  put<T>(key: string, value: T, ttlMs: number = IDEMPOTENCY_TTL_MS): void {
    this.entries.set(key, { expiresAt: Date.now() + ttlMs, value })
  }

  /** 只给测试用：清掉全部键，避免用例间互相污染 */
  clear(): void {
    this.entries.clear()
  }
}
