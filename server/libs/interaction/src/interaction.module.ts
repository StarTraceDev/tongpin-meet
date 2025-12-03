import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'
import { MeetingModule } from '../../meeting/src/meeting.module'

import { CheckinController } from './checkin.controller'
import { CheckinService } from './checkin.service'

@Module({
  imports: [AuthModule, MeetingModule],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class InteractionModule {}
