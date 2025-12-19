import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'
import { MeetingModule } from '../../meeting/src/meeting.module'

import { AdminController } from './admin.controller'
import { AdminMeetingsService } from './admin-meetings.service'
import { AdminStatsService } from './admin-stats.service'

@Module({
  imports: [AuthModule, MeetingModule],
  controllers: [AdminController],
  providers: [AdminStatsService, AdminMeetingsService],
})
export class AdminModule {}
