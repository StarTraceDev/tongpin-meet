import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'
import { MeetingModule } from '../../meeting/src/meeting.module'

import { AdminController } from './admin.controller'
import { AiConfigController } from './ai-config.controller'
import { AiConfigService } from './ai-config.service'
import { ConfigController } from './config.controller'
import { AlertRuleController } from './alert-rule.controller'
import { AlertRuleService } from './alert-rule.service'
import { ConfigService } from './config.service'
import { FeedbackController } from './feedback.controller'
import { FeedbackService } from './feedback.service'
import { HostMetricsController } from './host-metrics.controller'
import { HostMetricsService } from './host-metrics.service'
import { CostController } from './cost.controller'
import { CostService } from './cost.service'
import { AuditLogController } from './audit-log.controller'
import { AuditLogService } from './audit-log.service'
import { AdminMeetingsService } from './admin-meetings.service'
import { AdminStatsService } from './admin-stats.service'
import { SmsConfigController } from './sms-config.controller'
import { SmsConfigService } from './sms-config.service'

@Module({
  imports: [AuthModule, MeetingModule],
  controllers: [
    AdminController,
    SmsConfigController,
    AiConfigController,
    ConfigController,
    AlertRuleController,
    HostMetricsController,
    CostController,
    AuditLogController,
    FeedbackController,
  ],
  providers: [
    AdminStatsService,
    AdminMeetingsService,
    SmsConfigService,
    AiConfigService,
    ConfigService,
    AlertRuleService,
    HostMetricsService,
    CostService,
    AuditLogService,
    FeedbackService,
  ],
})
export class AdminModule {}
