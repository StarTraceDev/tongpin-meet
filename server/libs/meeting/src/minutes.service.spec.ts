import { describe, expect, it, vi } from 'vitest'

import { MinutesService } from './minutes.service'

const user = { id: 'u_host' } as never
const stranger = { id: 'u_other' } as never

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    meetingId: 'm_1',
    content: '',
    status: 'PENDING',
    version: 0,
    updatedById: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function makeService(): {
  service: MinutesService
  mocks: {
    meeting: { findUnique: ReturnType<typeof vi.fn> }
    participant: { findUnique: ReturnType<typeof vi.fn> }
    minutes: {
      upsert: ReturnType<typeof vi.fn>
      findUnique: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }
} {
  const mocks = {
    meeting: {
      findUnique: vi.fn().mockResolvedValue({ id: 'm_1', hostId: 'u_host', deletedAt: null }),
    },
    participant: { findUnique: vi.fn().mockResolvedValue({ role: 'ATTENDEE', leftAt: null }) },
    minutes: {
      upsert: vi.fn().mockResolvedValue(row()),
      findUnique: vi.fn().mockResolvedValue(row()),
      update: vi
        .fn()
        .mockImplementation(({ data }: { data: { version?: { increment: number } } }) =>
          Promise.resolve(row({ version: data.version?.increment ?? 0, content: '改过了' })),
        ),
    },
  }
  const prisma = {
    meeting: mocks.meeting,
    meetingParticipant: mocks.participant,
    meetingMinutes: mocks.minutes,
  }
  return { service: new MinutesService(prisma as never), mocks }
}

describe('MinutesService', () => {
  it('没有纪要时返回空草稿，参会人可读', async () => {
    const { service, mocks } = makeService()
    mocks.participant.findUnique.mockResolvedValue({ role: 'ATTENDEE', leftAt: null })
    const minutes = await service.get(stranger, 'm_1')
    expect(minutes).toMatchObject({ meetingId: 'm_1', version: 0, content: '' })
    expect(mocks.minutes.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { meetingId: 'm_1' }, update: {} }),
    )
  })

  it('非参会人读纪要 404', async () => {
    const { service, mocks } = makeService()
    mocks.meeting.findUnique.mockResolvedValue({ id: 'm_1', hostId: 'u_host', deletedAt: null })
    mocks.participant.findUnique.mockResolvedValue(null)
    await expect(service.get(stranger, 'm_1')).rejects.toMatchObject({ status: 404, code: 10000 })
  })

  it('主持人保存纪要：版本 +1 并记 updatedById', async () => {
    const { service, mocks } = makeService()
    mocks.minutes.findUnique.mockResolvedValue(row({ version: 0 }))
    const minutes = await service.update(user, 'm_1', { content: '改过了', version: 0 })
    expect(minutes.version).toBe(1)
    expect(mocks.minutes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { content: '改过了', version: { increment: 1 }, updatedById: 'u_host' },
      }),
    )
  })

  it('版本过期保存返回 409/30406', async () => {
    const { service, mocks } = makeService()
    mocks.minutes.findUnique.mockResolvedValue(row({ version: 2 }))
    await expect(
      service.update(user, 'm_1', { content: '旧版本', version: 1 }),
    ).rejects.toMatchObject({
      status: 409,
      code: 30406,
    })
  })

  it('参会人改纪要 403；生成把状态推成 GENERATING', async () => {
    const { service, mocks } = makeService()
    await expect(
      service.update(stranger, 'm_1', { content: 'x', version: 0 }),
    ).rejects.toMatchObject({
      status: 403,
    })
    mocks.minutes.upsert.mockResolvedValue(row({ status: 'GENERATING', version: 1 }))
    const minutes = await service.generate(user, 'm_1')
    expect(minutes.status).toBe('GENERATING')
  })
})
