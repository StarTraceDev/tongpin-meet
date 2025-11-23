import { Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Client } from 'pg'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- 构造函数注入需要运行时类
import { PrismaService } from '../../../libs/infra/src/prisma/prisma.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- 构造函数注入需要运行时类
import { WsGateway } from './ws.gateway'

const CHANNEL = 'meeting_events'

/**
 * 06 §M6-6：REST 动作（api 进程）只落库 + NOTIFY，gateway 进程 LISTEN 后广播。
 * 两个进程不共享内存，数据库是事件总线。
 */
@Injectable()
export class EventRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EventRelay')
  private client: Client | null = null
  private retryTimer: NodeJS.Timeout | null = null
  private stopped = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: WsGateway,
  ) {}

  onModuleInit(): void {
    void this.connect()
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true
    if (this.retryTimer !== null) clearTimeout(this.retryTimer)
    if (this.client !== null) await this.client.end().catch(() => undefined)
  }

  private async connect(): Promise<void> {
    const connectionString = process.env.DATABASE_URL
    if (connectionString === undefined) {
      this.logger.error('缺少 DATABASE_URL，事件中继不可用')
      return
    }
    const client = new Client({ connectionString })
    client.on('notification', (message) => {
      if (message.channel === CHANNEL && message.payload !== undefined)
        void this.relay(message.payload)
    })
    client.on('error', (error) => {
      this.logger.warn(`事件中继连接异常：${error.message}`)
      void this.reconnect()
    })
    try {
      await client.connect()
      await client.query(`LISTEN ${CHANNEL}`)
      this.client = client
      this.logger.log(`已订阅 ${CHANNEL}`)
    } catch (error) {
      this.logger.warn(`订阅失败，2s 后重试：${(error as Error).message}`)
      void client.end().catch(() => undefined)
      this.scheduleRetry()
    }
  }

  private scheduleRetry(): void {
    if (this.stopped || this.retryTimer !== null) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      void this.connect()
    }, 2000)
    this.retryTimer.unref()
  }

  private async reconnect(): Promise<void> {
    if (this.client !== null) await this.client.end().catch(() => undefined)
    this.client = null
    this.scheduleRetry()
  }

  private async relay(payload: string): Promise<void> {
    try {
      const { meetingId, seq } = JSON.parse(payload) as { meetingId?: unknown; seq?: unknown }
      if (typeof meetingId !== 'string' || typeof seq !== 'number') return
      const event = await this.prisma.meetingEvent.findUnique({
        where: { meetingId_seq: { meetingId, seq } },
      })
      if (event !== null) this.gateway.broadcastRecord(event)
    } catch (error) {
      this.logger.warn(`中继事件失败：${(error as Error).message}`)
    }
  }
}
