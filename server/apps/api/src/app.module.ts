import { Module } from '@nestjs/common'

import { AuthModule } from '../../../libs/auth/src/auth.module'
import { PrismaModule } from '../../../libs/infra/src/prisma/prisma.module'
import { MeetingModule } from '../../../libs/meeting/src/meeting.module'
import { InteractionModule } from '../../../libs/interaction/src/interaction.module'

import { HealthController } from './health.controller'

@Module({
  imports: [PrismaModule, AuthModule, MeetingModule, InteractionModule],
  controllers: [HealthController],
})
export class AppModule {}
