import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'
import { MeetingModule } from '../../meeting/src/meeting.module'

import { AdminController } from './admin.controller'
import { AiConfigController } from './ai-config.controller'
import { AiConfigService } from './ai-config.service'
import { ConfigController } from './config.controller'
import { ConfigService } from './config.service'
import { AdminMeetingsService } from './admin-meetings.service'
import { AdminStatsService } from './admin-stats.service'
import { SmsConfigController } from './sms-config.controller'
import { SmsConfigService } from './sms-config.service'

@Module({
  imports: [AuthModule, MeetingModule],
  controllers: [AdminController, SmsConfigController, AiConfigController, ConfigController],
  providers: [
    AdminStatsService,
    AdminMeetingsService,
    SmsConfigService,
    AiConfigService,
    ConfigService,
  ],
})
export class AdminModule {}
