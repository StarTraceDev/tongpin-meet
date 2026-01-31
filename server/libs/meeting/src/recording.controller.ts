import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'

import type { AuthUser, Recording, RecordingDetail, RecordingList } from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { RecordingService } from './recording.service'

@Controller()
@UseGuards(JwtAuthGuard)
export class RecordingController {
  constructor(private readonly recordings: RecordingService) {}

  /** 录制页：我参与过的会议的全部录制 */
  @Get('recordings')
  listMine(@CurrentUser() user: AuthUser): Promise<RecordingList> {
    return this.recordings.listMine(user)
  }

  @Get('recordings/:id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<RecordingDetail> {
    return this.recordings.detail(user, id)
  }

  @Get('meetings/:id/recordings')
  listByMeeting(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<RecordingList> {
    return this.recordings.listByMeeting(user, id)
  }

  @Post('meetings/:id/recordings\\:start')
  @HttpCode(201)
  start(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Recording> {
    return this.recordings.start(user, id)
  }

  @Post('meetings/:id/recordings/:recordingId\\:stop')
  @HttpCode(200)
  stop(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('recordingId') recordingId: string,
  ): Promise<Recording> {
    return this.recordings.stop(user, id, recordingId)
  }
}
