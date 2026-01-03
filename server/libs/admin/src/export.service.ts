import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { Injectable } from '@nestjs/common'

import type {
  ExportOperationAction,
  ExportOperationItem,
  ExportOperationList,
  ExportOperationQuery,
  ExportResource,
} from '../../../../packages/shared/src/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

const MAX_ROWS = 5000

type OperationRow = {
  id: string
  kind: string
  status: string
  progress: number
  result: unknown
  error: string | null
  createdAt: Date
  finishedAt: Date | null
}

type CsvCell = string | number | null

function csvEscape(value: CsvCell): string {
  if (value === null) {
    return ''
  }
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(','))
  return `\uFEFF${lines.join('\r\n')}`
}

/** 导出文件落服务端本地目录；单 api 实例够用，换对象存储时只改这里 */
function exportDir(): string {
  return process.env.TONGPIN_EXPORT_DIR ?? join(process.cwd(), 'storage', 'exports')
}

/** 06 §11.17：通用导出任务；202 + operations，前端轮询后下载 */
@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async start(resource: ExportResource, actorId: string): Promise<ExportOperationAction> {
    const row = await this.prisma.operation.create({
      data: {
        kind: `export:${resource}`,
        status: 'PENDING',
        requestedById: actorId,
        progress: 0,
      },
    })
    setImmediate(() => {
      void this.runExport(row.id, resource)
    })
    return { operation: this.toItem(row as OperationRow, resource) }
  }

  async list(query: ExportOperationQuery): Promise<ExportOperationList> {
    const where =
      query.resource === undefined
        ? { kind: { startsWith: 'export:' } }
        : { kind: `export:${query.resource}` }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.operation.count({ where }),
      this.prisma.operation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    return {
      items: rows.map((row) => this.toItem(row as OperationRow, this.resourceOf(row.kind))),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  async detail(id: string): Promise<ExportOperationItem> {
    const row = await this.prisma.operation.findUnique({ where: { id } })
    if (row === null || !row.kind.startsWith('export:')) {
      throw new ApiError(10000, '导出任务不存在', 404)
    }
    return this.toItem(row as OperationRow, this.resourceOf(row.kind))
  }

  async download(id: string): Promise<{ fileName: string; content: string }> {
    const item = await this.detail(id)
    if (item.status !== 'SUCCEEDED' || item.result === null) {
      throw new ApiError(10000, '导出任务尚未完成', 409)
    }
    try {
      const content = await readFile(join(exportDir(), item.result.fileName), 'utf8')
      return { fileName: item.result.fileName, content }
    } catch {
      throw new ApiError(10000, '导出文件已失效，请重新导出', 410)
    }
  }

  /** 供测试直接调用，避免依赖 setImmediate 时序 */
  async runExport(id: string, resource: ExportResource): Promise<void> {
    try {
      await this.prisma.operation.update({
        where: { id },
        data: { status: 'RUNNING', progress: 20 },
      })
      const { header, rows } = await this.buildCsv(resource)
      const csv = toCsv(header, rows)
      const fileName = `${resource}-${id}.csv`
      await mkdir(exportDir(), { recursive: true })
      await writeFile(join(exportDir(), fileName), csv, 'utf8')
      await this.prisma.operation.update({
        where: { id },
        data: {
          status: 'SUCCEEDED',
          progress: 100,
          finishedAt: new Date(),
          result: {
            fileName,
            rowCount: rows.length,
            sizeBytes: Buffer.byteLength(csv),
            url: `/admin/exports/${id}/file`,
          },
        },
      })
    } catch (cause) {
      await this.prisma.operation.update({
        where: { id },
        data: {
          status: 'FAILED',
          error: cause instanceof Error ? cause.message : '导出失败',
          finishedAt: new Date(),
        },
      })
    }
  }

  private async buildCsv(
    resource: ExportResource,
  ): Promise<{ header: string[]; rows: CsvCell[][] }> {
    if (resource === 'meetings') {
      const meetings = await this.prisma.meeting.findMany({
        where: { deletedAt: null },
        orderBy: { startAt: 'desc' },
        take: MAX_ROWS,
        include: { host: { select: { name: true } }, _count: { select: { participants: true } } },
      })
      return {
        header: [
          '会议号',
          '主题',
          '主持人',
          '状态',
          '计划开始',
          '实际开始',
          '实际结束',
          '参会人数',
        ],
        rows: meetings.map((meeting) => [
          meeting.meetingNo,
          meeting.title,
          meeting.host.name,
          meeting.status,
          meeting.startAt.toISOString(),
          meeting.actualStartAt?.toISOString() ?? null,
          meeting.actualEndAt?.toISOString() ?? null,
          meeting._count.participants,
        ]),
      }
    }

    if (resource === 'users') {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: MAX_ROWS,
        include: {
          dept: { select: { name: true } },
          roles: { include: { role: { select: { name: true } } } },
        },
      })
      return {
        header: ['手机号', '姓名', '状态', '部门', '角色', '最近登录', '创建时间'],
        rows: users.map((user) => [
          user.phone,
          user.name,
          user.status,
          user.dept?.name ?? null,
          user.roles.map((role) => role.role.name).join('/'),
          user.lastLoginAt?.toISOString() ?? null,
          user.createdAt.toISOString(),
        ]),
      }
    }

    if (resource === 'audit-logs') {
      const logs = await this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: MAX_ROWS,
      })
      const names = await this.userNames(logs.map((log) => log.actorId))
      return {
        header: ['时间', '操作者ID', '操作者', '动作', '目标类型', '目标ID', 'IP', '详情'],
        rows: logs.map((log) => [
          log.createdAt.toISOString(),
          log.actorId,
          names.get(log.actorId) ?? null,
          log.action,
          log.targetType,
          log.targetId,
          log.ip,
          log.detail === null ? null : JSON.stringify(log.detail),
        ]),
      }
    }

    const feedbacks = await this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
    })
    const names = await this.userNames(
      feedbacks
        .flatMap((item) => [item.reporterId, item.handledBy])
        .filter((id): id is string => id !== null),
    )
    return {
      header: [
        '提交时间',
        '分类',
        '状态',
        '内容',
        '联系方式',
        '来源',
        '提交人',
        '处理人',
        '回复',
        '处理时间',
      ],
      rows: feedbacks.map((item) => [
        item.createdAt.toISOString(),
        item.category,
        item.status,
        item.content,
        item.contact,
        item.source,
        item.reporterId === null ? null : (names.get(item.reporterId) ?? null),
        item.handledBy === null ? null : (names.get(item.handledBy) ?? null),
        item.reply,
        item.handledAt?.toISOString() ?? null,
      ]),
    }
  }

  private async userNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)]
    if (unique.length === 0) {
      return new Map()
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    })
    return new Map(users.map((user) => [user.id, user.name]))
  }

  private resourceOf(kind: string): ExportResource {
    const resource = kind.replace('export:', '')
    if (
      resource === 'meetings' ||
      resource === 'users' ||
      resource === 'audit-logs' ||
      resource === 'feedbacks'
    ) {
      return resource
    }
    throw new ApiError(10000, '未知导出资源', 400)
  }

  private toItem(row: OperationRow, resource: ExportResource): ExportOperationItem {
    const result =
      row.result === null || typeof row.result !== 'object'
        ? null
        : (row.result as ExportOperationItem['result'])
    return {
      id: row.id,
      resource,
      status: row.status as ExportOperationItem['status'],
      progress: row.progress,
      error: row.error,
      result,
      createdAt: row.createdAt.toISOString(),
      finishedAt: row.finishedAt === null ? null : row.finishedAt.toISOString(),
    }
  }
}
