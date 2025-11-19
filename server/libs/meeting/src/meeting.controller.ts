import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import {
  claimHostSchema,
  createMeetingSchema,
  joinAsGuestSchema,
  joinMeetingSchema,
  listMeetingsQuerySchema,
  transferHostSchema,
  updateMeetingSchema,
} from '../../../../packages/shared/src/schemas'
import type {
  AuthUser,
  ClaimHostInput,
  JoinAsGuestInput,
  Meeting,
  MeetingCreated,
  MeetingJoinResult,
  MeetingWaiting,
  Paginated,
  RtcToken,
  TransferHostInput,
  WaitingEntry,
} from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { MeetingService } from './meeting.service'

class CreateMeetingDto extends createZodDto(createMeetingSchema) {}
class UpdateMeetingDto extends createZodDto(updateMeetingSchema) {}
class ListMeetingsDto extends createZodDto(listMeetingsQuerySchema) {}
class JoinMeetingDto extends createZodDto(joinMeetingSchema) {}
class JoinAsGuestDto extends createZodDto(joinAsGuestSchema) {}
class ClaimHostDto extends createZodDto(claimHostSchema) {}
class TransferHostDto extends createZodDto(transferHostSchema) {}

@Controller('meetings')
export class MeetingController {
  constructor(private readonly meetings: MeetingService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMeetingsDto,
  ): Promise<Paginated<Meeting>> {
    return this.meetings.list(user, query)
  }

  // 必须在 :id 之前，否则 trash 会被当成 id
  @Get('trash')
  @UseGuards(JwtAuthGuard)
  trash(@CurrentUser() user: AuthUser): Promise<Paginated<Meeting>> {
    return this.meetings.trash(user)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateMeetingDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<MeetingCreated> {
    return this.meetings.create(user, body, idempotencyKey)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async detail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: { setHeader: (name: string, value: string) => void },
  ): Promise<Meeting> {
    const { meeting, etag } = await this.meetings.detail(user, id)
    res.setHeader('ETag', etag)
    return meeting
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateMeetingDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) res: { setHeader: (name: string, value: string) => void },
  ): Promise<Meeting> {
    const { meeting, etag } = await this.meetings.update(user, id, ifMatch, body)
    res.setHeader('ETag', etag)
    return meeting
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.meetings.remove(user, id)
  }

  @Post(':id\\:restore')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Meeting> {
    return this.meetings.restore(user, id)
  }

  @Post(':id\\:join')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async join(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: JoinMeetingDto,
    @Res({ passthrough: true }) res: { status: (code: number) => void },
  ): Promise<MeetingJoinResult | MeetingWaiting> {
    const result = await this.meetings.join(user, id, body)
    if ('waiting' in result) res.status(202)
    return result
  }

  @Post(':id\\:leave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.meetings.leave(user, id)
  }

  @Post(':id\\:end')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  end(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Meeting> {
    return this.meetings.end(user, id)
  }

  @Post(':id/rtcTokens')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  rtcToken(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<RtcToken> {
    return this.meetings.issueRtcToken(user, id)
  }

  @Post(':id\\:lock')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  lock(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Meeting> {
    return this.meetings.lock(user, id, true)
  }

  @Post(':id\\:unlock')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  unlock(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Meeting> {
    return this.meetings.lock(user, id, false)
  }

  @Post(':id\\:transferHost')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  transferHost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: TransferHostDto,
  ): Promise<Meeting> {
    return this.meetings.transferHost(user, id, body as TransferHostInput)
  }

  @Post(':id\\:takeoverHost')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  takeoverHost(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Meeting> {
    return this.meetings.takeoverHost(user, id)
  }

  @Post(':id\\:claimHost')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  claimHost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ClaimHostDto,
  ): Promise<Meeting> {
    return this.meetings.claimHost(user, id, body as ClaimHostInput)
  }

  @Get(':id/waiting')
  @UseGuards(JwtAuthGuard)
  listWaiting(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<WaitingEntry[]> {
    return this.meetings.listWaiting(user, id)
  }

  @Post(':id/waiting/:entryId\\:admit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  admit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ): Promise<MeetingJoinResult> {
    return this.meetings.admit(user, id, entryId)
  }

  @Post(':id/waiting/:entryId\\:deny')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  deny(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ): Promise<void> {
    return this.meetings.deny(user, id, entryId)
  }

  @Post(':id/waiting\\:admitAll')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  admitAll(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ count: number }> {
    return this.meetings.admitAll(user, id)
  }
}

/** 游客入口不挂登录守卫（06 §M4-12）；路由是 `POST /meetings:joinAsGuest`，没有斜杠 */
@Controller()
export class MeetingGuestController {
  constructor(private readonly meetings: MeetingService) {}

  @Post('meetings\\:joinAsGuest')
  @HttpCode(200)
  joinAsGuest(@Body() body: JoinAsGuestDto): Promise<MeetingJoinResult | MeetingWaiting> {
    return this.meetings.joinAsGuest(body as JoinAsGuestInput)
  }
}
