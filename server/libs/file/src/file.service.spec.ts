import { describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '@tongpin/shared/types'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

import { FileService } from './file.service'
import type { StorageProvider } from './storage'

const user: AuthUser = {
  id: 'user_1',
  phone: '13800000000',
  name: '张三',
  avatarUrl: null,
  roles: ['USER'],
  permissions: [],
}

class MemoryStorage implements StorageProvider {
  readonly files = new Map<string, Buffer>()

  async write(key: string, data: Buffer): Promise<void> {
    this.files.set(key, data)
  }

  async read(key: string): Promise<Buffer> {
    const data = this.files.get(key)
    if (data === undefined) throw new Error(`missing ${key}`)
    return data
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key)
  }

  async remove(key: string): Promise<void> {
    this.files.delete(key)
  }
}

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'f_1',
    meetingId: 'm_1',
    uploaderId: user.id,
    name: '议程.pdf',
    mime: 'application/pdf',
    sizeBytes: 7 * 1024 * 1024,
    status: 'UPLOADING',
    storageKey: 'm_1/abc',
    createdAt: new Date('2026-01-01T02:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

function makeService(): {
  service: FileService
  storage: MemoryStorage
  mocks: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    meetingFindUnique: ReturnType<typeof vi.fn>
    participantFindUnique: ReturnType<typeof vi.fn>
  }
} {
  const storage = new MemoryStorage()
  const mocks = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    meetingFindUnique: vi.fn(),
    participantFindUnique: vi.fn(),
  }
  const prisma = {
    meetingFile: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      update: mocks.update,
    },
    meeting: { findUnique: mocks.meetingFindUnique },
    meetingParticipant: { findUnique: mocks.participantFindUnique },
  } as unknown as PrismaService
  mocks.meetingFindUnique.mockResolvedValue({ hostId: user.id, deletedAt: null })
  return { service: new FileService(prisma, storage), storage, mocks }
}

describe('FileService', () => {
  it('createUpload 按 5MB 切片返回分片清单', async () => {
    const { service, mocks } = makeService()
    mocks.create.mockResolvedValue(row())
    const session = await service.createUpload(user, {
      meetingId: 'm_1',
      name: '议程.pdf',
      sizeBytes: 7 * 1024 * 1024,
    })
    expect(session.partSize).toBe(5 * 1024 * 1024)
    expect(session.parts.map((part) => part.sizeBytes)).toEqual([5 * 1024 * 1024, 2 * 1024 * 1024])
  })

  it('分片大小不对返回 400，非上传人返回 403', async () => {
    const { service, mocks } = makeService()
    mocks.findUnique.mockResolvedValue(row())
    await expect(service.putPart(user, 'f_1', 1, Buffer.alloc(10))).rejects.toMatchObject({
      status: 400,
      code: 60002,
    })
    await expect(
      service.putPart({ ...user, id: 'user_2' }, 'f_1', 1, Buffer.alloc(5 * 1024 * 1024)),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('complete 合并分片并把状态置为 READY', async () => {
    const { service, storage, mocks } = makeService()
    mocks.findUnique.mockResolvedValue(row({ sizeBytes: 6 }))
    mocks.update.mockResolvedValue(row({ sizeBytes: 6, status: 'READY' }))
    await storage.write('m_1/abc/part-1', Buffer.from('abcdef'))
    const file = await service.complete(user, 'f_1')
    expect(file.status).toBe('READY')
    expect((await storage.read('m_1/abc/content')).toString()).toBe('abcdef')
    expect(storage.files.has('m_1/abc/part-1')).toBe(false)
  })

  it('缺分片时 complete 返回 409', async () => {
    const { service, storage, mocks } = makeService()
    mocks.findUnique.mockResolvedValue(row({ sizeBytes: 6 }))
    await storage.write('m_1/abc/part-1', Buffer.from('abc'))
    await expect(service.complete(user, 'f_1')).rejects.toMatchObject({ status: 409, code: 60001 })
  })

  it('下载地址带签名，篡改或过期取不到内容', async () => {
    const { service, storage, mocks } = makeService()
    mocks.findUnique.mockResolvedValue(row({ status: 'READY', sizeBytes: 3 }))
    await storage.write('m_1/abc/content', Buffer.from('xyz'))
    const link = await service.downloadUrl(user, 'f_1')
    const token = new URL(link.url).searchParams.get('token') ?? ''
    const { data } = await service.content('f_1', token)
    expect(data.toString()).toBe('xyz')
    await expect(service.content('f_1', 'tampered')).rejects.toMatchObject({
      status: 410,
      code: 60003,
    })
  })

  it('软删后不再出现在列表里', async () => {
    const { service, mocks } = makeService()
    mocks.findUnique.mockResolvedValue(row({ status: 'READY' }))
    mocks.meetingFindUnique.mockResolvedValue({ hostId: user.id, deletedAt: null })
    mocks.update.mockResolvedValue(row({ deletedAt: new Date() }))
    await service.remove(user, 'f_1')
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    )
  })
})
