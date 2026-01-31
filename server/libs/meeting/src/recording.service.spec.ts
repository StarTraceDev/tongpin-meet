import { describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '@tongpin/shared/types'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

import { RecordingService } from './recording.service'

const host: AuthUser = {
  id: 'user_1',
  phone: '13800000000',
  name: '管理员',
  avatarUrl: null,
  roles: ['SUPER_ADMIN'],
  permissions: [],
}

interface PrismaMocks {
  prisma: PrismaService
  recording: {
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  meeting: { findFirst: ReturnType<typeof vi.fn> }
}

function makePrisma(): PrismaMocks {
  const recording = {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  }
  const prisma = {
    meeting: { findFirst: vi.fn() },
    recording,
  } as unknown as PrismaService
  return {
    prisma,
    recording,
    meeting: (prisma as unknown as { meeting: { findFirst: ReturnType<typeof vi.fn> } }).meeting,
  }
}

describe('RecordingService', () => {
  it('主持人开始录制写入 RECORDING', async () => {
    const { prisma, recording, meeting } = makePrisma()
    meeting.findFirst.mockResolvedValue({ id: 'm_1', hostId: host.id, deletedAt: null })
    recording.findFirst.mockResolvedValue(null)
    recording.create.mockResolvedValue({
      id: 'r_1',
      meetingId: 'm_1',
      startedById: host.id,
      status: 'RECORDING',
      durationSec: null,
      sizeBytes: null,
      startedAt: new Date('2026-01-01T02:00:00.000Z'),
      stoppedAt: null,
      meeting: { title: '周会' },
    })
    const service = new RecordingService(prisma)

    const result = await service.start(host, 'm_1')

    expect(result.status).toBe('RECORDING')
    expect(result.meetingTitle).toBe('周会')
  })

  it('非主持人开始录制被拒绝', async () => {
    const { prisma, meeting } = makePrisma()
    meeting.findFirst.mockResolvedValue({ id: 'm_1', hostId: 'user_2', deletedAt: null })
    const service = new RecordingService(prisma)

    await expect(service.start(host, 'm_1')).rejects.toMatchObject({ status: 403 })
  })

  it('停止录制算出时长并置 READY', async () => {
    const { prisma, recording, meeting } = makePrisma()
    meeting.findFirst.mockResolvedValue({ id: 'm_1', hostId: host.id, deletedAt: null })
    recording.findFirst.mockResolvedValue({
      id: 'r_1',
      meetingId: 'm_1',
      startedAt: new Date(Date.now() - 65_000),
      status: 'RECORDING',
    })
    recording.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'r_1',
      meetingId: 'm_1',
      startedById: host.id,
      status: data.status,
      durationSec: data.durationSec,
      sizeBytes: null,
      startedAt: new Date(Date.now() - 65_000),
      stoppedAt: data.stoppedAt,
      meeting: { title: '周会' },
    }))
    const service = new RecordingService(prisma)

    const result = await service.stop(host, 'm_1', 'r_1')

    expect(result.status).toBe('READY')
    expect(result.durationSec).toBeGreaterThanOrEqual(64)
    expect(result.durationSec).toBeLessThanOrEqual(66)
  })

  it('重复停止同一录制返回冲突', async () => {
    const { prisma, recording, meeting } = makePrisma()
    meeting.findFirst.mockResolvedValue({ id: 'm_1', hostId: host.id, deletedAt: null })
    recording.findFirst.mockResolvedValue({ id: 'r_1', meetingId: 'm_1', status: 'READY' })
    const service = new RecordingService(prisma)

    await expect(service.stop(host, 'm_1', 'r_1')).rejects.toMatchObject({ status: 409 })
  })
})
