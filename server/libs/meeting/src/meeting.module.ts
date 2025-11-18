import { Module } from '@nestjs/common'

import { IdempotencyService } from '../../common/src/idempotency.service'
import { AuthModule } from '../../auth/src/auth.module'

import { MeetingController, MeetingGuestController } from './meeting.controller'
import { MeetingService } from './meeting.service'
import { MockRtcPort } from './rtc/mock-rtc.port'
import { RTC_PORT } from './rtc/rtc.port'

@Module({
  imports: [AuthModule],
  controllers: [MeetingController, MeetingGuestController],
  providers: [MeetingService, IdempotencyService, { provide: RTC_PORT, useClass: MockRtcPort }],
  exports: [MeetingService],
})
export class MeetingModule {}
