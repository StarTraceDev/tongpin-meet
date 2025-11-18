/** RTC token 签发端口；07 §11.2 的 RTC_PROVIDER=mock / livekit 只换实现 */
export interface IssuedRtcToken {
  token: string
  url: string
  expiresAt: Date
}

export interface RtcPort {
  issue(roomName: string, identity: string, ttlSeconds?: number): Promise<IssuedRtcToken>
}

export const RTC_PORT = Symbol('RTC_PORT')

/** 06 §M4-10：房间名服务端定，token 有效期 ≤ 6h */
export const RTC_TOKEN_TTL_SECONDS = 6 * 60 * 60
