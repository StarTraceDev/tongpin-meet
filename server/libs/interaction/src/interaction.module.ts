import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'
import { MeetingModule } from '../../meeting/src/meeting.module'

import { BreakController } from './break.controller'
import { BreakService } from './break.service'
import { CheckinController } from './checkin.controller'
import { CheckinService } from './checkin.service'
import { InteractionAccess } from './interaction-access'
import { VoteController } from './vote.controller'
import { VoteService } from './vote.service'

@Module({
  imports: [AuthModule, MeetingModule],
  controllers: [CheckinController, VoteController, BreakController],
  providers: [CheckinService, VoteService, BreakService, InteractionAccess],
  exports: [CheckinService, VoteService, BreakService],
})
export class InteractionModule {}
