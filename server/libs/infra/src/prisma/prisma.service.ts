import { PrismaPg } from '@prisma/adapter-pg'
import { Injectable, type OnModuleDestroy } from '@nestjs/common'

import { PrismaClient } from '../generated/prisma/client'

/**
 * Prisma 7 走 driver adapter，连接串只从 DATABASE_URL 取。
 * 故意不在 onModuleInit 里 $connect：首个查询才建连，进程启动不依赖数据库可用。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL
    if (connectionString === undefined || connectionString === '') {
      throw new Error('缺少 DATABASE_URL，复制 server/.env.example 为 server/.env 后再启动')
    }
    super({ adapter: new PrismaPg({ connectionString }) })
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
