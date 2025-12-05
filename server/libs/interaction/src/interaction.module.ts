import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'
import { MeetingModule } from '../../meeting/src/meeting.module'

import { CheckinController } from './checkin.controller'
import { CheckinService } from './checkin.service'
import { InteractionAccess } from './interaction-access'
import { VoteController } from './vote.controller'
import { VoteService } from './vote.service'

@Module({
  imports: [AuthModule, MeetingModule],
  controllers: [CheckinController, VoteController],
  providers: [CheckinService, VoteService, InteractionAccess],
  exports: [CheckinService, VoteService],
})
export class InteractionModule {}
