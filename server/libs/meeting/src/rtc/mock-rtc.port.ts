import { randomUUID } from 'node:crypto'

import { Injectable, Logger } from '@nestjs/common'

import { RTC_TOKEN_TTL_SECONDS, type IssuedRtcToken, type RtcPort } from './rtc.port'

/**
 * 开发用 RTC：不发真 token，只把 room/identity/过期时间拼成可自解释的串。
 * 前端拿到后不能真连 LiveKit，但入会流程、权限、状态机都能端到端验证。
 */
@Injectable()
export class MockRtcPort implements RtcPort {
  private readonly logger = new Logger('MockRtc')

  issue(
    roomName: string,
    identity: string,
    ttlSeconds = RTC_TOKEN_TTL_SECONDS,
  ): Promise<IssuedRtcToken> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
    const token = `mock.${Buffer.from(JSON.stringify({ roomName, identity, exp: expiresAt.getTime() })).toString('base64url')}.${randomUUID()}`
    this.logger.log(`issue room=${roomName} identity=${identity}`)
    return Promise.resolve({ token, url: 'ws://127.0.0.1:7880', expiresAt })
  }
}
