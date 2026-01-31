import { Module } from '@nestjs/common'

import { IdempotencyService } from '../../common/src/idempotency.service'
import { AuthModule } from '../../auth/src/auth.module'

import { MeetingController, MeetingGuestController } from './meeting.controller'
import { MinutesController } from './minutes.controller'
import { RecordingController } from './recording.controller'
import { RecordingService } from './recording.service'
import { MeetingService } from './meeting.service'
import { MinutesService } from './minutes.service'
import { MockRtcPort } from './rtc/mock-rtc.port'
import { RTC_PORT } from './rtc/rtc.port'

@Module({
  imports: [AuthModule],
  controllers: [MeetingController, MeetingGuestController, MinutesController, RecordingController],
  providers: [
    MeetingService,
    MinutesService,
    RecordingService,
    IdempotencyService,
    { provide: RTC_PORT, useClass: MockRtcPort },
  ],
  exports: [MeetingService, MinutesService, RecordingService],
})
export class MeetingModule {}
