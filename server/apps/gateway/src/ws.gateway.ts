import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

import { Logger } from '@nestjs/common'
import { WebSocketGateway } from '@nestjs/websockets'
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets'
import type { WebSocket } from 'ws'

import { verifyWsTicket } from '@app/common'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../../libs/infra/src/prisma/prisma.service'

interface ClientState {
  userId: string
  sessionId: string
  meetingId: string | null
  lastPong: number
}

const PING_INTERVAL_MS = 25_000
const PONG_TIMEOUT_MS = 10_000

function secret(): string {
  const value = process.env.JWT_SECRET
  if (value === undefined || value.length < 32) {
    throw new Error('JWT_SECRET 未配置或长度不足 32 位（07 §13.3）')
  }
  return value
}

/**
 * C1 通道骨架（04 §6.9）：ticket 鉴权 → room.join 校验参会身份 → room.snapshot。
 * 真正的业务事件由各服务后续通过 broadcast() 推。
 */
@WebSocketGateway({ path: '/ws' })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('WsGateway')
  private readonly clients = new Map<WebSocket, ClientState>()
  private readonly roomSeq = new Map<string, number>()
  private readonly timer: NodeJS.Timeout

  constructor(private readonly prisma: PrismaService) {
    this.timer = setInterval(() => void this.heartbeat(), PING_INTERVAL_MS)
    this.timer.unref()
  }

  handleConnection(client: WebSocket, request: IncomingMessage): void {
    const url = new URL(request.url ?? '/ws', 'http://localhost')
    const payload = verifyWsTicket(secret(), url.searchParams.get('ticket') ?? '')
    if (payload === null) {
      client.close(4401, 'unauthenticated')
      return
    }
    this.clients.set(client, {
      userId: payload.sub,
      sessionId: payload.sid,
      meetingId: null,
      lastPong: Date.now(),
    })
    client.on('message', (raw: Buffer) => {
      void this.onMessage(client, raw.toString())
    })
    this.send(client, 'sys.ping', { ts: Date.now() })
  }

  handleDisconnect(client: WebSocket): void {
    this.clients.delete(client)
  }

  /** 后续业务广播入口：seq 按房间单调递增 */
  broadcast(meetingId: string, type: string, data: unknown): void {
    const seq = (this.roomSeq.get(meetingId) ?? 0) + 1
    this.roomSeq.set(meetingId, seq)
    const envelope = {
      v: 1,
      id: randomUUID(),
      type,
      ts: Date.now(),
      from: 'server',
      meetingId,
      seq,
      data,
    }
    for (const [client, state] of this.clients) {
      if (state.meetingId === meetingId) this.rawSend(client, envelope)
    }
  }

  private async onMessage(client: WebSocket, raw: string): Promise<void> {
    const state = this.clients.get(client)
    if (state === undefined) return

    let message: { type?: unknown; meetingId?: unknown }
    try {
      message = JSON.parse(raw) as { type?: unknown; meetingId?: unknown }
    } catch {
      this.error(client, '消息不是合法 JSON')
      return
    }

    if (message.type === 'sys.pong') {
      state.lastPong = Date.now()
      return
    }
    if (message.type === 'room.join') {
      await this.joinRoom(client, state, String(message.meetingId ?? ''))
      return
    }
    this.error(client, `未知消息类型：${String(message.type)}`)
  }

  private async joinRoom(client: WebSocket, state: ClientState, meetingId: string): Promise<void> {
    if (meetingId === '') {
      this.error(client, 'room.join 缺少 meetingId')
      return
    }
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
      select: { id: true, status: true, hostId: true, lockedAt: true, roomName: true },
    })
    if (meeting === null) {
      this.error(client, '会议不存在', 4404)
      return
    }
    if (meeting.lockedAt !== null) {
      this.error(client, '会议已锁定', 4403)
      return
    }
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: state.userId } },
      select: { role: true, leftAt: true },
    })
    if (participant === null && meeting.hostId !== state.userId) {
      this.error(client, '不在会议中', 4403)
      return
    }

    state.meetingId = meetingId
    const [members, seq] = await Promise.all([
      this.prisma.meetingParticipant.findMany({
        where: { meetingId, leftAt: null },
        select: { userId: true, guestName: true, role: true, mediaState: true },
        orderBy: { joinedAt: 'asc' },
      }),
      Promise.resolve(this.roomSeq.get(meetingId) ?? 0),
    ])

    this.rawSend(client, {
      v: 1,
      id: randomUUID(),
      type: 'room.snapshot',
      ts: Date.now(),
      from: 'server',
      meetingId,
      seq,
      data: {
        meetingId,
        status: meeting.status,
        roomName: meeting.roomName,
        participants: members,
      },
    })
  }

  private heartbeat(): void {
    const now = Date.now()
    for (const [client, state] of this.clients) {
      if (now - state.lastPong > PONG_TIMEOUT_MS + PING_INTERVAL_MS) {
        this.logger.warn(`心跳超时，断开 ${state.userId}`)
        client.close(4408, 'heartbeat timeout')
        this.clients.delete(client)
        continue
      }
      this.send(client, 'sys.ping', { ts: now })
    }
  }

  private error(client: WebSocket, message: string, code = 4400): void {
    this.rawSend(client, {
      v: 1,
      id: randomUUID(),
      type: 'room.error',
      ts: Date.now(),
      code,
      data: { message },
    })
  }

  private send(client: WebSocket, type: string, data: unknown): void {
    this.rawSend(client, { v: 1, id: randomUUID(), type, ts: Date.now(), data })
  }

  private rawSend(client: WebSocket, payload: unknown): void {
    if (client.readyState === 1) client.send(JSON.stringify(payload))
  }
}
