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
  createMeetingSchema,
  listMeetingsQuerySchema,
  updateMeetingSchema,
} from '../../../../packages/shared/src/schemas'
import type { AuthUser, Meeting, MeetingCreated, Paginated } from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { MeetingService } from './meeting.service'

class CreateMeetingDto extends createZodDto(createMeetingSchema) {}
class UpdateMeetingDto extends createZodDto(updateMeetingSchema) {}
class ListMeetingsDto extends createZodDto(listMeetingsQuerySchema) {}

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingController {
  constructor(private readonly meetings: MeetingService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMeetingsDto,
  ): Promise<Paginated<Meeting>> {
    return this.meetings.list(user, query)
  }

  // 必须在 :id 之前，否则 trash 会被当成 id
  @Get('trash')
  trash(@CurrentUser() user: AuthUser): Promise<Paginated<Meeting>> {
    return this.meetings.trash(user)
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateMeetingDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<MeetingCreated> {
    return this.meetings.create(user, body, idempotencyKey)
  }

  @Get(':id')
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
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.meetings.remove(user, id)
  }

  @Post(':id\\:restore')
  @HttpCode(200)
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Meeting> {
    return this.meetings.restore(user, id)
  }
}
