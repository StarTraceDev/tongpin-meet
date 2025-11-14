import { randomInt } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'

import { ApiError } from '../../../common/src/errors/api-error'
import { ERROR_CODES, LIMITS } from '../../../../../packages/shared/src/constants'

import { SMS_PORT, type SmsPort } from './sms.port'

interface CodeEntry {
  code: string
  expiresAt: number
  attempts: number
  lastSentAt: number
}

/**
 * 验证码与频控都放进程内存（单 api 实例；M8 接 Redis 后搬走）。
 * 频控口径按 06 §M3-3：同号 60s/10 条每日，同 IP 20 条/小时，错 5 次作废。
 */
@Injectable()
export class SmsCodeStore {
  private readonly codes = new Map<string, CodeEntry>()
  private readonly daily = new Map<string, { day: string; count: number }>()
  private readonly ipHits = new Map<string, number[]>()

  constructor(@Inject(SMS_PORT) private readonly sender: SmsPort) {}

  async send(phone: string, ip: string | undefined): Promise<void> {
    const now = Date.now()
    const existing = this.codes.get(phone)
    if (existing !== undefined && now - existing.lastSentAt < LIMITS.SMS_INTERVAL_SECONDS * 1000) {
      throw new ApiError(ERROR_CODES.AUTH_SMS_RATE_LIMITED, '验证码发送过于频繁，请稍后再试', 429)
    }

    const day = new Date(now).toISOString().slice(0, 10)
    const counter = this.daily.get(phone)
    const usedToday = counter?.day === day ? counter.count : 0
    if (usedToday >= LIMITS.SMS_DAILY_PER_PHONE) {
      throw new ApiError(ERROR_CODES.AUTH_SMS_RATE_LIMITED, '今日验证码发送次数已用完', 429)
    }

    if (ip !== undefined) {
      const hits = (this.ipHits.get(ip) ?? []).filter((at) => now - at < 3_600_000)
      if (hits.length >= LIMITS.SMS_HOURLY_PER_IP) {
        throw new ApiError(ERROR_CODES.AUTH_SMS_RATE_LIMITED, '当前网络请求过于频繁', 429)
      }
      hits.push(now)
      this.ipHits.set(ip, hits)
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    this.codes.set(phone, {
      code,
      expiresAt: now + LIMITS.SMS_CODE_TTL_SECONDS * 1000,
      attempts: 0,
      lastSentAt: now,
    })
    this.daily.set(phone, { day, count: usedToday + 1 })
    await this.sender.sendCode(phone, code)
  }

  /** 校验通过即作废；错 5 次也作废，必须重新发码 */
  verify(phone: string, code: string): void {
    const entry = this.codes.get(phone)
    if (entry === undefined || entry.expiresAt <= Date.now()) {
      this.codes.delete(phone)
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '验证码不正确或已过期', 401)
    }
    if (entry.attempts >= LIMITS.SMS_CODE_MAX_ATTEMPTS) {
      this.codes.delete(phone)
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '验证码不正确或已过期', 401)
    }
    if (entry.code !== code) {
      entry.attempts += 1
      if (entry.attempts >= LIMITS.SMS_CODE_MAX_ATTEMPTS) this.codes.delete(phone)
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '验证码不正确或已过期', 401)
    }
    this.codes.delete(phone)
  }
}
