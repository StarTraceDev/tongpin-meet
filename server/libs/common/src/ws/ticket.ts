import { JwtService } from '@nestjs/jwt'

/** 04 §6.9：ws ticket 一次性、短命（60s），只能换连接不能当 access token 用 */
export const WS_TICKET_TTL_SECONDS = 60

export interface WsTicketPayload {
  sub: string
  sid: string
  typ: 'ws'
}

export function signWsTicket(
  secret: string,
  userId: string,
  sessionId: string,
): { ticket: string; expiresAt: string } {
  const now = Date.now()
  const ticket = new JwtService({ secret }).sign(
    { sub: userId, sid: sessionId, typ: 'ws' } satisfies WsTicketPayload,
    { expiresIn: WS_TICKET_TTL_SECONDS },
  )
  return { ticket, expiresAt: new Date(now + WS_TICKET_TTL_SECONDS * 1000).toISOString() }
}

export function verifyWsTicket(secret: string, ticket: string): WsTicketPayload | null {
  try {
    const payload = new JwtService({ secret }).verify<WsTicketPayload>(ticket)
    if (
      payload.typ !== 'ws' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string'
    ) {
      return null
    }
    return payload
  } catch {
    return null
  }
}
