import { Module } from '@nestjs/common'

import { PrismaModule } from '../../../libs/infra/src/prisma/prisma.module'

import { HealthController } from './health.controller'

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
