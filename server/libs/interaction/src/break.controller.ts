import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'

import {
  breakRecordInputSchema,
  createBreakSchema,
  updateBreakSchema,
} from '../../../../packages/shared/src/schemas'
import type {
  AuthUser,
  Break,
  BreakOverview,
  BreakRecordInput,
  BreakRecordResult,
  CreateBreakInput,
  UpdateBreakInput,
} from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/src/pipes/zod-validation.pipe'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { BreakService } from './break.service'

@Controller('meetings/:meetingId/breaks')
@UseGuards(JwtAuthGuard)
export class BreakController {
  constructor(private readonly breaks: BreakService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('meetingId') meetingId: string): Promise<Break[]> {
    return this.breaks.list(user, meetingId)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Body(new ZodValidationPipe(createBreakSchema)) input: CreateBreakInput,
  ): Promise<Break> {
    return this.breaks.create(user, meetingId, input)
  }

  @Patch(':breakId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('breakId') breakId: string,
    @Body(new ZodValidationPipe(updateBreakSchema)) input: UpdateBreakInput,
  ): Promise<Break> {
    return this.breaks.update(user, meetingId, breakId, input)
  }

  @Post(':breakId\\:close')
  @HttpCode(200)
  close(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('breakId') breakId: string,
  ): Promise<Break> {
    return this.breaks.close(user, meetingId, breakId)
  }

  @Get(':breakId/records')
  overview(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('breakId') breakId: string,
  ): Promise<BreakOverview> {
    return this.breaks.overview(user, meetingId, breakId)
  }

  @Post(':breakId/records')
  record(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('breakId') breakId: string,
    @Body(new ZodValidationPipe(breakRecordInputSchema)) input: BreakRecordInput,
  ): Promise<BreakRecordResult> {
    return this.breaks.setRecord(user, meetingId, breakId, input.resting)
  }
}
