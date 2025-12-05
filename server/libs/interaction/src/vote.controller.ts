import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'

import {
  createVoteSchema,
  submitVoteSchema,
  updateVoteSchema,
} from '../../../../packages/shared/src/schemas'
import type {
  AuthUser,
  CreateVoteInput,
  SubmitVoteInput,
  UpdateVoteInput,
  Vote,
  VoteResults,
  VoteSubmissionResult,
} from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/src/pipes/zod-validation.pipe'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { VoteService } from './vote.service'

@Controller('meetings/:meetingId/votes')
@UseGuards(JwtAuthGuard)
export class VoteController {
  constructor(private readonly votes: VoteService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('meetingId') meetingId: string): Promise<Vote[]> {
    return this.votes.list(user, meetingId)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Body(new ZodValidationPipe(createVoteSchema)) input: CreateVoteInput,
  ): Promise<Vote> {
    return this.votes.create(user, meetingId, input)
  }

  @Get(':voteId')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('voteId') voteId: string,
  ): Promise<Vote> {
    return this.votes.detail(user, meetingId, voteId)
  }

  @Patch(':voteId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('voteId') voteId: string,
    @Body(new ZodValidationPipe(updateVoteSchema)) input: UpdateVoteInput,
  ): Promise<Vote> {
    return this.votes.update(user, meetingId, voteId, input)
  }

  @Delete(':voteId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('voteId') voteId: string,
  ): Promise<void> {
    return this.votes.remove(user, meetingId, voteId)
  }

  @Post(':voteId\\:start')
  start(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('voteId') voteId: string,
  ): Promise<Vote> {
    return this.votes.start(user, meetingId, voteId)
  }

  @Post(':voteId\\:close')
  close(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('voteId') voteId: string,
  ): Promise<Vote> {
    return this.votes.close(user, meetingId, voteId)
  }

  @Post(':voteId\\:publish')
  publish(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('voteId') voteId: string,
  ): Promise<Vote> {
    return this.votes.publish(user, meetingId, voteId)
  }

  @Post(':voteId/submissions')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('voteId') voteId: string,
    @Body(new ZodValidationPipe(submitVoteSchema)) input: SubmitVoteInput,
  ): Promise<VoteSubmissionResult> {
    return this.votes.submit(user, meetingId, voteId, input)
  }

  @Get(':voteId/results')
  results(
    @CurrentUser() user: AuthUser,
    @Param('meetingId') meetingId: string,
    @Param('voteId') voteId: string,
  ): Promise<VoteResults> {
    return this.votes.results(user, meetingId, voteId)
  }
}
