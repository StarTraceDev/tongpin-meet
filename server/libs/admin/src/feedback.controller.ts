import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import type { AuthUser } from '../../../../packages/shared/src/types'
import type {
  FeedbackAction,
  FeedbackItem,
  FeedbackList,
} from '../../../../packages/shared/src/types'
import {
  feedbackCreateSchema,
  feedbackQuerySchema,
  feedbackUpdateSchema,
} from '../../../../packages/shared/src/schemas'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { FeedbackService } from './feedback.service'

class ListFeedbacksDto extends createZodDto(feedbackQuerySchema) {}
class CreateFeedbackDto extends createZodDto(feedbackCreateSchema) {}
class UpdateFeedbackDto extends createZodDto(feedbackUpdateSchema) {}

/** 04 §6.8 投诉反馈 */
@Controller('admin/feedbacks')
@UseGuards(JwtAuthGuard, RbacGuard)
export class FeedbackController {
  constructor(private readonly feedbacks: FeedbackService) {}

  @Get()
  @RequirePermissions('feedback:read')
  list(@Query() query: ListFeedbacksDto): Promise<FeedbackList> {
    return this.feedbacks.list(query)
  }

  @Post()
  @RequirePermissions('feedback:write')
  create(@Body() input: CreateFeedbackDto): Promise<FeedbackAction> {
    return this.feedbacks.create(input)
  }

  @Get(':id')
  @RequirePermissions('feedback:read')
  detail(@Param('id') id: string): Promise<FeedbackItem> {
    return this.feedbacks.detail(id)
  }

  @Patch(':id')
  @RequirePermissions('feedback:write')
  handle(
    @Param('id') id: string,
    @Body() input: UpdateFeedbackDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FeedbackAction> {
    return this.feedbacks.handle(id, input, user.id)
  }
}
