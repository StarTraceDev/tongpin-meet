import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SmsCodeStore } from './sms-code.store'

const sender = { sendCode: vi.fn<(phone: string, code: string) => Promise<void>>() }

function sentCode(call = 0): string {
  const args = sender.sendCode.mock.calls[call]
  if (args === undefined) throw new Error('还没发过验证码')
  return args[1]
}

describe('SmsCodeStore', () => {
  let store: SmsCodeStore

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    sender.sendCode.mockReset().mockResolvedValue(undefined)
    store = new SmsCodeStore(sender)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('同号 60 秒内重发 → 429/20105', async () => {
    await store.send('13800000001', '10.0.0.1')
    await expect(store.send('13800000001', '10.0.0.1')).rejects.toMatchObject({
      code: 20105,
      status: 429,
    })

    vi.advanceTimersByTime(61_000)
    await expect(store.send('13800000001', '10.0.0.1')).resolves.toBeUndefined()
  })

  it('同号每日 10 条封顶', async () => {
    for (let i = 0; i < 10; i += 1) {
      await store.send('13800000002', `10.0.0.${i}`)
      vi.advanceTimersByTime(61_000)
    }
    await expect(store.send('13800000002', '10.0.0.99')).rejects.toMatchObject({ code: 20105 })
  })

  it('同 IP 每小时 20 条封顶', async () => {
    for (let i = 0; i < 20; i += 1) {
      await store.send(`138000001${String(i).padStart(2, '0')}`, '10.0.0.7')
    }
    await expect(store.send('13800000999', '10.0.0.7')).rejects.toMatchObject({ code: 20105 })
  })

  it('错 5 次后连正确码也作废', async () => {
    await store.send('13800000003', '10.0.0.3')
    const code = sentCode()
    for (let i = 0; i < 5; i += 1) {
      expect(() => store.verify('13800000003', '000000')).toThrow()
    }
    expect(() => store.verify('13800000003', code)).toThrow()
  })

  it('验证通过后一次性作废', async () => {
    await store.send('13800000004', '10.0.0.4')
    const code = sentCode()
    expect(() => store.verify('13800000004', code)).not.toThrow()
    expect(() => store.verify('13800000004', code)).toThrow()
  })
})
