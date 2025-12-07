import { Controller, Delete, Get, HttpCode, Param, UseGuards } from '@nestjs/common'

import type { AuthUser, MeetingFile } from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { FileService } from './file.service'

@Controller('meetings/:meetingId/files')
@UseGuards(JwtAuthGuard)
export class MeetingFileController {
  constructor(private readonly files: FileService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
  ): Promise<MeetingFile[]> {
    return this.files.list(user, meetingId)
  }

  @Delete(':fileId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('fileId') fileId: string,
  ): Promise<void> {
    void meetingId
    await this.files.remove(user, fileId)
  }
}
