import { describe, expect, it } from 'vitest'

import { signWsTicket, verifyWsTicket } from './ticket'

const SECRET = 'test-secret-at-least-32-characters-long'

describe('ws ticket', () => {
  it('签发后能验证出用户与会话', () => {
    const { ticket, expiresAt } = signWsTicket(SECRET, 'u_1', 's_1')
    const payload = verifyWsTicket(SECRET, ticket)
    expect(payload).toMatchObject({ sub: 'u_1', sid: 's_1', typ: 'ws' })
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('换密钥验证失败', () => {
    const { ticket } = signWsTicket(SECRET, 'u_1', 's_1')
    expect(verifyWsTicket(`${SECRET}-other`, ticket)).toBeNull()
  })

  it('乱码 ticket 返回 null', () => {
    expect(verifyWsTicket(SECRET, 'not-a-jwt')).toBeNull()
  })
})
