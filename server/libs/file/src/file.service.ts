import { Inject, Injectable } from '@nestjs/common'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import { FILE_PART_SIZE_BYTES } from '../../../../packages/shared/src/schemas/file'
import type {
  AuthUser,
  CreateUploadInput,
  DownloadUrl,
  MeetingFile,
  UploadSession,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
import { STORAGE_PROVIDER } from './storage'
import type { StorageProvider } from './storage'

interface FileRow {
  id: string
  meetingId: string
  uploaderId: string
  name: string
  mime: string | null
  sizeBytes: number
  status: 'UPLOADING' | 'READY'
  storageKey: string
  createdAt: Date
  deletedAt: Date | null
}

const DOWNLOAD_TTL_MS = 10 * 60 * 1000

function toFile(row: FileRow): MeetingFile {
  return {
    id: row.id,
    meetingId: row.meetingId,
    uploaderId: row.uploaderId,
    name: row.name,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }
}

/** 文件：6.5 的 createUpload / parts / complete / 元信息 / 下载 / 列表 / 软删 */
@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async createUpload(user: AuthUser, input: CreateUploadInput): Promise<UploadSession> {
    await this.assertVisible(user, input.meetingId)
    const file = (await this.prisma.meetingFile.create({
      data: {
        meetingId: input.meetingId,
        uploaderId: user.id,
        name: input.name,
        mime: input.mime ?? null,
        sizeBytes: input.sizeBytes,
        storageKey: `${input.meetingId}/${randomUUID()}`,
      },
    })) as unknown as FileRow
    return { fileId: file.id, partSize: FILE_PART_SIZE_BYTES, parts: this.partPlan(file.sizeBytes) }
  }

  async putPart(user: AuthUser, fileId: string, index: number, body: Buffer): Promise<void> {
    const file = await this.findFile(fileId)
    if (file.uploaderId !== user.id) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '只有上传人可以续传分片', 403)
    }
    if (file.status !== 'UPLOADING') {
      throw new ApiError(ERROR_CODES.FILE_UPLOAD_INVALID, '文件已上传完成', 409)
    }
    const plan = this.partPlan(file.sizeBytes)
    const target = plan.find((part) => part.index === index)
    if (target === undefined) {
      throw new ApiError(ERROR_CODES.FILE_PART_INVALID, '分片序号超出范围', 400)
    }
    if (!Buffer.isBuffer(body) || body.length === 0 || body.length !== target.sizeBytes) {
      throw new ApiError(
        ERROR_CODES.FILE_PART_INVALID,
        `分片 ${index} 大小应为 ${target.sizeBytes} 字节`,
        400,
      )
    }
    await this.storage.write(`${file.storageKey}/part-${index}`, body)
  }

  async complete(user: AuthUser, fileId: string): Promise<MeetingFile> {
    const file = await this.findFile(fileId)
    if (file.uploaderId !== user.id) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '只有上传人可以完成上传', 403)
    }
    if (file.status === 'READY') return toFile(file)
    const plan = this.partPlan(file.sizeBytes)
    const chunks: Buffer[] = []
    for (const part of plan) {
      const key = `${file.storageKey}/part-${part.index}`
      if (!(await this.storage.exists(key))) {
        throw new ApiError(
          ERROR_CODES.FILE_UPLOAD_INVALID,
          `缺少分片 ${part.index}/${plan.length}`,
          409,
        )
      }
      chunks.push(await this.storage.read(key))
    }
    const merged = Buffer.concat(chunks)
    if (merged.length !== file.sizeBytes) {
      throw new ApiError(ERROR_CODES.FILE_UPLOAD_INVALID, '合并后大小与声明不一致', 409)
    }
    await this.storage.write(`${file.storageKey}/content`, merged)
    for (const part of plan) {
      await this.storage.remove(`${file.storageKey}/part-${part.index}`)
    }
    const updated = (await this.prisma.meetingFile.update({
      where: { id: file.id },
      data: { status: 'READY' },
    })) as unknown as FileRow
    return toFile(updated)
  }

  async get(user: AuthUser, fileId: string): Promise<MeetingFile> {
    const file = await this.findFile(fileId)
    await this.assertVisible(user, file.meetingId)
    return toFile(file)
  }

  async list(user: AuthUser, meetingId: string): Promise<MeetingFile[]> {
    await this.assertVisible(user, meetingId)
    const rows = (await this.prisma.meetingFile.findMany({
      where: { meetingId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })) as unknown as FileRow[]
    return rows.map(toFile)
  }

  async remove(user: AuthUser, fileId: string): Promise<void> {
    const file = await this.findFile(fileId)
    const meeting = (await this.prisma.meeting.findUnique({
      where: { id: file.meetingId },
      select: { hostId: true },
    })) as { hostId: string } | null
    if (file.uploaderId !== user.id && meeting?.hostId !== user.id) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '只有上传人或主持人可以删除', 403)
    }
    await this.prisma.meetingFile.update({
      where: { id: file.id },
      data: { deletedAt: new Date() },
    })
    await this.storage.remove(`${file.storageKey}/content`)
  }

  async downloadUrl(user: AuthUser, fileId: string): Promise<DownloadUrl> {
    const file = await this.findFile(fileId)
    await this.assertVisible(user, file.meetingId)
    if (file.status !== 'READY') {
      throw new ApiError(ERROR_CODES.FILE_UPLOAD_INVALID, '文件还没上传完成', 409)
    }
    const expiresAt = Date.now() + DOWNLOAD_TTL_MS
    const token = `${expiresAt}.${this.sign(`${file.id}.${expiresAt}`)}`
    const origin = process.env.PUBLIC_API_ORIGIN ?? `http://127.0.0.1:${process.env.PORT ?? '3000'}`
    return {
      url: `${origin}/api/v1/files/${file.id}/content?token=${encodeURIComponent(token)}`,
      expiresAt: new Date(expiresAt).toISOString(),
    }
  }

  async content(fileId: string, token: string): Promise<{ file: MeetingFile; data: Buffer }> {
    const file = await this.findFile(fileId)
    if (file.status !== 'READY') {
      throw new ApiError(ERROR_CODES.FILE_UPLOAD_INVALID, '文件还没上传完成', 409)
    }
    if (!this.verify(file.id, token)) {
      throw new ApiError(ERROR_CODES.FILE_DOWNLOAD_EXPIRED, '下载链接无效或已过期', 410)
    }
    const data = await this.storage.read(`${file.storageKey}/content`)
    return { file: toFile(file), data }
  }

  private sign(payload: string): string {
    const secret = process.env.DOWNLOAD_SECRET ?? process.env.JWT_SECRET ?? 'dev-download-secret'
    return createHmac('sha256', secret).update(payload).digest('base64url')
  }

  private verify(fileId: string, token: string): boolean {
    // token = <expiresAt>.<signature>
    const [expiresRaw = '', signature = ''] = token.split('.')
    const expiresAt = Number(expiresRaw)
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false
    const expected = this.sign(`${fileId}.${expiresAt}`)
    const left = Buffer.from(signature)
    const right = Buffer.from(expected)
    return left.length === right.length && timingSafeEqual(left, right)
  }

  private partPlan(sizeBytes: number): Array<{ index: number; sizeBytes: number }> {
    const count = Math.ceil(sizeBytes / FILE_PART_SIZE_BYTES)
    return Array.from({ length: count }, (_, offset) => ({
      index: offset + 1,
      sizeBytes: Math.min(FILE_PART_SIZE_BYTES, sizeBytes - offset * FILE_PART_SIZE_BYTES),
    }))
  }

  private async findFile(fileId: string): Promise<FileRow> {
    const row = (await this.prisma.meetingFile.findUnique({
      where: { id: fileId },
    })) as unknown as FileRow | null
    if (row === null || row.deletedAt !== null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '文件不存在', 404)
    }
    return row
  }

  private async assertVisible(user: AuthUser, meetingId: string): Promise<void> {
    const meeting = (await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { hostId: true, deletedAt: true },
    })) as { hostId: string; deletedAt: Date | null } | null
    if (meeting === null || meeting.deletedAt !== null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    if (meeting.hostId === user.id) return
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: user.id } },
    })
    if (participant === null) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '不在会议中，无法访问文件', 403)
    }
  }
}
