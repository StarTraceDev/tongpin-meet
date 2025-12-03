import { Body, Controller, Get, Header, Param, Post, UseGuards } from '@nestjs/common'

import { createCheckinSchema } from '../../../../packages/shared/src/schemas'
import type {
  AuthUser,
  Checkin,
  CheckinOverview,
  CheckinResult,
  CreateCheckinInput,
} from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/src/pipes/zod-validation.pipe'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { CheckinService } from './checkin.service'

@Controller('meetings/:meetingId/checkins')
@UseGuards(JwtAuthGuard)
export class CheckinController {
  constructor(private readonly checkins: CheckinService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('meetingId') meetingId: string): Promise<Checkin[]> {
    return this.checkins.list(user, meetingId)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Body(new ZodValidationPipe(createCheckinSchema)) input: CreateCheckinInput,
  ): Promise<Checkin> {
    return this.checkins.create(user, meetingId, input)
  }

  @Post(':checkinId\\:close')
  close(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('checkinId') checkinId: string,
  ): Promise<Checkin> {
    return this.checkins.close(user, meetingId, checkinId)
  }

  @Get(':checkinId/records')
  overview(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('checkinId') checkinId: string,
  ): Promise<CheckinOverview> {
    return this.checkins.overview(user, meetingId, checkinId)
  }

  @Post(':checkinId/records')
  record(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('checkinId') checkinId: string,
  ): Promise<CheckinResult> {
    return this.checkins.record(user, meetingId, checkinId)
  }

  @Get(':checkinId/records\\:export')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="checkin.csv"')
  export(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('checkinId') checkinId: string,
  ): Promise<string> {
    return this.checkins.exportCsv(user, meetingId, checkinId)
  }
}
