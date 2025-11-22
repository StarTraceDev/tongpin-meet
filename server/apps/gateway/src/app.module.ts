import { Module } from '@nestjs/common'

import { PrismaModule } from '../../../libs/infra/src/prisma/prisma.module'

import { HealthController } from './health.controller'
import { WsGateway } from './ws.gateway'

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [WsGateway],
})
export class AppModule {}
