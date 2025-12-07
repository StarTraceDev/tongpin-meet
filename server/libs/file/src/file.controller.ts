import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'

import { createUploadSchema } from '../../../../packages/shared/src/schemas/file'
import type {
  AuthUser,
  CreateUploadInput,
  DownloadUrl,
  MeetingFile,
  UploadSession,
} from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/src/pipes/zod-validation.pipe'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { FileService } from './file.service'

interface RawRequest {
  body: Buffer
}

interface ResponseLike {
  setHeader: (name: string, value: string) => void
  end: (body: Buffer) => void
}

@Controller()
export class FileController {
  constructor(private readonly files: FileService) {}

  @Post('files\\:createUpload')
  @UseGuards(JwtAuthGuard)
  createUpload(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createUploadSchema)) input: CreateUploadInput,
  ): Promise<UploadSession> {
    return this.files.createUpload(user, input)
  }

  @Post('files/:fileId/parts')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async putPart(
    @CurrentUser() user: AuthUser,
    @Param('fileId') fileId: string,
    @Query('index') index: string,
    @Req() req: RawRequest,
  ): Promise<void> {
    const parsed = Number(index)
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error('分片序号必须是正整数')
    }
    await this.files.putPart(user, fileId, parsed, req.body)
  }

  @Post('files/:fileId\\:complete')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Param('fileId') fileId: string): Promise<MeetingFile> {
    return this.files.complete(user, fileId)
  }

  @Delete('files/:fileId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('fileId') fileId: string): Promise<void> {
    await this.files.remove(user, fileId)
  }

  @Get('files/:fileId\\:download')
  @UseGuards(JwtAuthGuard)
  downloadUrl(
    @CurrentUser() user: AuthUser,
    @Param('fileId') fileId: string,
  ): Promise<DownloadUrl> {
    return this.files.downloadUrl(user, fileId)
  }

  @Get('files/:fileId')
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthUser, @Param('fileId') fileId: string): Promise<MeetingFile> {
    return this.files.get(user, fileId)
  }

  /** 预签名地址指向这里，靠 token 鉴权，不再要求 Bearer */
  @Get('files/:fileId/content')
  async content(
    @Param('fileId') fileId: string,
    @Query('token') token: string,
    @Res() res: ResponseLike,
  ): Promise<void> {
    const { file, data } = await this.files.content(fileId, token ?? '')
    res.setHeader('content-type', file.mime ?? 'application/octet-stream')
    res.setHeader('content-length', String(data.length))
    res.setHeader(
      'content-disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    )
    res.end(data)
  }
}
