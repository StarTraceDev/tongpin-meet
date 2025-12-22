import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'
import { MeetingModule } from '../../meeting/src/meeting.module'

import { AdminController } from './admin.controller'
import { AdminMeetingsService } from './admin-meetings.service'
import { AdminStatsService } from './admin-stats.service'
import { SmsConfigController } from './sms-config.controller'
import { SmsConfigService } from './sms-config.service'

@Module({
  imports: [AuthModule, MeetingModule],
  controllers: [AdminController, SmsConfigController],
  providers: [AdminStatsService, AdminMeetingsService, SmsConfigService],
})
export class AdminModule {}
