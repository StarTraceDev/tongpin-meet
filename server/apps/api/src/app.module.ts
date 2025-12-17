import { Module } from '@nestjs/common'

import { AuthModule } from '../../../libs/auth/src/auth.module'
import { PrismaModule } from '../../../libs/infra/src/prisma/prisma.module'
import { MeetingModule } from '../../../libs/meeting/src/meeting.module'
import { FileModule } from '../../../libs/file/src/file.module'
import { InteractionModule } from '../../../libs/interaction/src/interaction.module'
import { AdminModule } from '../../../libs/admin/src/admin.module'

import { HealthController } from './health.controller'

@Module({
  imports: [PrismaModule, AuthModule, MeetingModule, InteractionModule, FileModule, AdminModule],
  controllers: [HealthController],
})
export class AppModule {}
