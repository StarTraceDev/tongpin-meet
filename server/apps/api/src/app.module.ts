import { Module } from '@nestjs/common'

import { AuthModule } from '../../../libs/auth/src/auth.module'
import { PrismaModule } from '../../../libs/infra/src/prisma/prisma.module'

import { HealthController } from './health.controller'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
