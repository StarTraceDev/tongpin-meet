import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { ExportService } from './export.service'

let dir = ''

const meetingRow = {
  meetingNo: '123456789',
  title: '产品周会',
  status: 'ENDED',
  startAt: new Date('2026-01-01T02:00:00Z'),
  actualStartAt: new Date('2026-01-01T02:05:00Z'),
  actualEndAt: new Date('2026-01-01T03:00:00Z'),
  host: { name: '张明' },
  _count: { participants: 8 },
}

function createPrisma(): never {
  return {
    operation: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'op_1',
        kind: data.kind,
        status: data.status,
        progress: 0,
        result: null,
        error: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        finishedAt: null,
      })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
      })),
      findUnique: vi.fn(async () => ({
        id: 'op_1',
        kind: 'export:meetings',
        status: 'SUCCEEDED',
        progress: 100,
        result: {
          fileName: 'meetings-op_1.csv',
          rowCount: 1,
          sizeBytes: 40,
          url: '/admin/exports/op_1/file',
        },
        error: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        finishedAt: new Date('2026-01-01T00:01:00Z'),
      })),
      findMany: vi.fn(async () => [
        {
          id: 'op_1',
          kind: 'export:meetings',
          status: 'SUCCEEDED',
          progress: 100,
          result: null,
          error: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          finishedAt: null,
        },
      ]),
      count: vi.fn(async () => 1),
    },
    meeting: { findMany: vi.fn(async () => [meetingRow]) },
    user: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
  } as never
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'tongpin-export-'))
  process.env.TONGPIN_EXPORT_DIR = dir
})

afterAll(async () => {
  delete process.env.TONGPIN_EXPORT_DIR
  await rm(dir, { recursive: true, force: true })
})

describe('ExportService', () => {
  it('创建任务返回 PENDING', async () => {
    const prisma = createPrisma()
    const service = new ExportService(prisma)

    const result = await service.start('meetings', 'u_9')

    expect(result.operation).toMatchObject({
      id: 'op_1',
      resource: 'meetings',
      status: 'PENDING',
      progress: 0,
    })
    const args = (prisma as never as { operation: { create: ReturnType<typeof vi.fn> } }).operation
      .create.mock.calls[0]?.[0]
    expect(args.data).toMatchObject({ kind: 'export:meetings', requestedById: 'u_9' })
  })

  it('导出成功时落盘并写回结果', async () => {
    const prisma = createPrisma()
    const service = new ExportService(prisma)

    await service.runExport('op_1', 'meetings')

    const update = (prisma as never as { operation: { update: ReturnType<typeof vi.fn> } })
      .operation.update
    const last = update.mock.calls.at(-1)?.[0]
    expect(last.data).toMatchObject({ status: 'SUCCEEDED', progress: 100 })
    expect(last.data.result).toMatchObject({ rowCount: 1 })

    const csv = await readFile(join(dir, 'meetings-op_1.csv'), 'utf8')
    expect(csv.startsWith('\uFEFF会议号,主题,主持人')).toBe(true)
    expect(csv).toContain('123456789,产品周会,张明,ENDED')
  })

  it('导出失败时记 FAILED 与原因', async () => {
    const prisma = createPrisma()
    ;(
      prisma as never as { meeting: { findMany: ReturnType<typeof vi.fn> } }
    ).meeting.findMany.mockRejectedValue(new Error('数据库连接超时'))
    const service = new ExportService(prisma)

    await service.runExport('op_1', 'meetings')

    const update = (prisma as never as { operation: { update: ReturnType<typeof vi.fn> } })
      .operation.update
    expect(update.mock.calls.at(-1)?.[0].data).toMatchObject({
      status: 'FAILED',
      error: '数据库连接超时',
    })
  })

  it('下载未完成任务返回 409', async () => {
    const prisma = createPrisma()
    ;(
      prisma as never as { operation: { findUnique: ReturnType<typeof vi.fn> } }
    ).operation.findUnique.mockResolvedValue({
      id: 'op_1',
      kind: 'export:meetings',
      status: 'RUNNING',
      progress: 40,
      result: null,
      error: null,
      createdAt: new Date(),
      finishedAt: null,
    })
    const service = new ExportService(prisma)

    await expect(service.download('op_1')).rejects.toMatchObject({ status: 409 })
  })

  it('下载已完成任务返回文件内容', async () => {
    const prisma = createPrisma()
    await writeFile(join(dir, 'meetings-op_1.csv'), '\uFEFF会议号\n123456789', 'utf8')
    const service = new ExportService(prisma)

    const file = await service.download('op_1')

    expect(file.fileName).toBe('meetings-op_1.csv')
    expect(file.content).toContain('123456789')
  })

  it('列表按 kind 前缀映射资源', async () => {
    const prisma = createPrisma()
    const service = new ExportService(prisma)

    const result = await service.list({ page: 1, pageSize: 20 })

    expect(result.items[0]).toMatchObject({ id: 'op_1', resource: 'meetings' })
  })
})
