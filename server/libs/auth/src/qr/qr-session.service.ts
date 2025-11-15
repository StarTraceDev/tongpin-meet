import { randomInt } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../../packages/shared/src/constants'
import type { AuthUser, QrPoll, QrSession } from '@tongpin/shared/types'

import { ApiError } from '../../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../../infra/src/prisma/prisma.service'
import type { RequestContext } from '../auth.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AuthService } from '../auth.service'

/** 设备码有效期 5 分钟：够用户切到已登录浏览器输码，又不至于长期挂着 */
export const QR_SESSION_TTL_MS = 5 * 60 * 1000

interface QrRow {
  id: string
  code: string
  status: QrSession['status']
  userId: string | null
  expiresAt: Date
  createdAt: Date
}

function toQrSession(row: QrRow): QrSession {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

@Injectable()
export class QrSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** 公开接口：PC 打开登录页就建一个会话并显示 id + code */
  async create(): Promise<QrSession> {
    const expiresAt = new Date(Date.now() + QR_SESSION_TTL_MS)
    // 6 位码只有 100 万种，重试几次足够；同一时刻只约束 PENDING 内的唯一性
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
      const clash = await this.prisma.qrSession.findFirst({
        where: { code, status: 'PENDING', expiresAt: { gt: new Date() } },
      })
      if (clash !== null) continue
      const row = await this.prisma.qrSession.create({ data: { code, expiresAt } })
      return toQrSession(row)
    }
    throw new ApiError(90000, '设备码生成失败，请重试', 503)
  }

  /** 公开接口：PC 轮询；一旦确认就发一次 token，随后转 CONSUMED 不再重复下发 */
  async poll(id: string, ctx: RequestContext): Promise<QrPoll> {
    const row = await this.findOrFail(id)
    if (
      (row.status === 'PENDING' || row.status === 'CONFIRMED') &&
      row.expiresAt.getTime() <= Date.now()
    ) {
      const expired = await this.prisma.qrSession.update({
        where: { id },
        data: { status: 'EXPIRED' },
      })
      return { id: expired.id, status: expired.status, expiresAt: expired.expiresAt.toISOString() }
    }
    if (row.status !== 'CONFIRMED') {
      return { id: row.id, status: row.status, expiresAt: row.expiresAt.toISOString() }
    }

    // 先原子占位：并发轮询只有一个能把 CONFIRMED 改成 CONSUMED，避免发两份 token
    const claimed = await this.prisma.qrSession.updateMany({
      where: { id, status: 'CONFIRMED' },
      data: { status: 'CONSUMED' },
    })
    if (claimed.count === 0) {
      const current = await this.findOrFail(id)
      return {
        id: current.id,
        status: current.status,
        expiresAt: current.expiresAt.toISOString(),
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: row.userId ?? '' },
      include: { roles: { include: { role: true } } },
    })
    if (user === null) {
      throw new ApiError(90000, '确认的用户已不存在', 500)
    }

    const { session, sessionId } = await this.auth.issueSession(user, {
      ip: ctx.ip,
      ua: ctx.ua,
      deviceId: ctx.deviceId ?? 'qr-device',
    })
    await this.prisma.qrSession.update({ where: { id }, data: { deviceSessionId: sessionId } })
    await this.prisma.loginLog.create({
      data: {
        userId: user.id,
        phone: user.phone,
        channel: 'qr',
        success: true,
        ip: ctx.ip,
        ua: ctx.ua,
      },
    })
    return {
      id: row.id,
      status: 'CONSUMED',
      expiresAt: row.expiresAt.toISOString(),
      session,
    }
  }

  /** 已登录浏览器确认：把设备码会话绑到当前用户 */
  async confirm(id: string, code: string, user: AuthUser): Promise<void> {
    const row = await this.findOrFail(id)
    if (row.status !== 'PENDING' || row.expiresAt.getTime() <= Date.now() || row.code !== code) {
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '设备码不正确或已过期', 400)
    }
    await this.prisma.qrSession.update({
      where: { id },
      data: { status: 'CONFIRMED', userId: user.id, confirmedAt: new Date() },
    })
  }

  /** 已登录浏览器拒绝：PC 轮询到 REJECTED 后回到登录页 */
  async reject(id: string, user: AuthUser): Promise<void> {
    const row = await this.findOrFail(id)
    if (row.status !== 'PENDING' || row.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '设备码已失效', 400)
    }
    await this.prisma.qrSession.update({
      where: { id },
      data: { status: 'REJECTED', userId: user.id, confirmedAt: new Date() },
    })
  }

  private async findOrFail(id: string): Promise<QrRow> {
    const row = await this.prisma.qrSession.findUnique({ where: { id } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '设备码不存在', 404)
    }
    return row
  }
}
