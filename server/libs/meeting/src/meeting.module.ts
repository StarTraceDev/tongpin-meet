import { Module } from '@nestjs/common'

import { IdempotencyService } from '../../common/src/idempotency.service'
import { AuthModule } from '../../auth/src/auth.module'

import { MeetingController } from './meeting.controller'
import { MeetingService } from './meeting.service'

@Module({
  imports: [AuthModule],
  controllers: [MeetingController],
  providers: [MeetingService, IdempotencyService],
  exports: [MeetingService],
})
export class MeetingModule {}
