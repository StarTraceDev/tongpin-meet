import { Injectable } from '@nestjs/common'

import {
  ERROR_CODES,
  VOTE_TRANSITIONS,
  assertTransition,
  IllegalTransitionError,
} from '../../../../packages/shared/src/constants'
import type {
  AuthUser,
  CreateVoteInput,
  SubmitVoteInput,
  UpdateVoteInput,
  Vote,
  VoteOption,
  VoteQuestion,
  VoteResults,
  VoteState,
  VoteSubmissionResult,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { MeetingService } from '../../meeting/src/meeting.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { InteractionAccess } from './interaction-access'

interface QuestionRow {
  id: string
  index: number
  content: string
  type: 'SINGLE' | 'MULTI' | 'RATING'
  options: Array<{ id: string; index: number; content: string }>
}

interface VoteRow {
  id: string
  meetingId: string
  title: string
  status: VoteState
  anonymous: boolean
  createdById: string
  createdAt: Date
  startedAt: Date | null
  closedAt: Date | null
  publishedAt: Date | null
  questions: QuestionRow[]
}

interface AnswerInput {
  questionId: string
  optionIds: string[]
  rating?: number
}

function toVote(row: VoteRow): Vote {
  return {
    id: row.id,
    meetingId: row.meetingId,
    title: row.title,
    status: row.status,
    anonymous: row.anonymous,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt === null ? null : row.startedAt.toISOString(),
    closedAt: row.closedAt === null ? null : row.closedAt.toISOString(),
    publishedAt: row.publishedAt === null ? null : row.publishedAt.toISOString(),
    questions: row.questions
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((question): VoteQuestion => ({
        id: question.id,
        index: question.index,
        content: question.content,
        type: question.type,
        options: question.options
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((option): VoteOption => ({
            id: option.id,
            index: option.index,
            content: option.content,
          })),
      })),
  }
}

/** 投票：06 §M5-5.2；状态机 DRAFT → ONGOING → CLOSED → PUBLISHED（03 §5.4） */
@Injectable()
export class VoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: InteractionAccess,
    private readonly meetings: MeetingService,
  ) {}

  async list(user: AuthUser, meetingId: string): Promise<Vote[]> {
    const meeting = await this.access.assertVisible(user, meetingId)
    const rows = (await this.prisma.vote.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
      include: { questions: { include: { options: true } } },
    })) as unknown as VoteRow[]
    // 草稿只有主持人 / 联席能看见
    const canManage = await this.canManage(user, meeting, meetingId)
    return rows.filter((row) => canManage || row.status !== 'DRAFT').map(toVote)
  }

  async create(user: AuthUser, meetingId: string, input: CreateVoteInput): Promise<Vote> {
    const meeting = await this.access.assertManage(user, meetingId)
    if (meeting.status !== 'ONGOING') {
      throw new ApiError(ERROR_CODES.MEETING_ENDED, '会议尚未开始或已结束', 409)
    }
    const row = (await this.prisma.vote.create({
      data: {
        meetingId,
        title: input.title,
        anonymous: input.anonymous,
        createdById: user.id,
        questions: {
          create: input.questions.map((question, questionIndex) => ({
            index: questionIndex + 1,
            content: question.content,
            type: question.type,
            options: {
              create: question.options.map((option, optionIndex) => ({
                index: optionIndex + 1,
                content: option.content,
              })),
            },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    })) as unknown as VoteRow
    return toVote(row)
  }

  async detail(user: AuthUser, meetingId: string, voteId: string): Promise<Vote> {
    const meeting = await this.access.assertVisible(user, meetingId)
    const row = await this.findOwned(meetingId, voteId)
    if (row.status === 'DRAFT' && !(await this.canManage(user, meeting, meetingId))) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '投票不存在', 404)
    }
    return toVote(row)
  }

  async update(
    user: AuthUser,
    meetingId: string,
    voteId: string,
    input: UpdateVoteInput,
  ): Promise<Vote> {
    await this.access.assertManage(user, meetingId)
    const row = await this.findOwned(meetingId, voteId)
    this.assertStatus(row.status, 'DRAFT', '只有草稿可以修改')

    const updated = (await this.prisma.$transaction(async (tx) => {
      if (input.questions !== undefined) {
        const oldQuestions = (await tx.voteQuestion.findMany({
          where: { voteId: row.id },
          select: { id: true },
        })) as Array<{ id: string }>
        const oldIds = oldQuestions.map((item) => item.id)
        if (oldIds.length > 0) {
          await tx.voteOption.deleteMany({ where: { questionId: { in: oldIds } } })
          await tx.voteQuestion.deleteMany({ where: { id: { in: oldIds } } })
        }
      }
      const result = await tx.vote.update({
        where: { id: row.id },
        data: {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.anonymous === undefined ? {} : { anonymous: input.anonymous }),
          ...(input.questions === undefined
            ? {}
            : {
                questions: {
                  create: input.questions.map((question, questionIndex) => ({
                    index: questionIndex + 1,
                    content: question.content,
                    type: question.type,
                    options: {
                      create: question.options.map((option, optionIndex) => ({
                        index: optionIndex + 1,
                        content: option.content,
                      })),
                    },
                  })),
                },
              }),
        },
        include: { questions: { include: { options: true } } },
      })
      return result as unknown as VoteRow
    })) as VoteRow
    return toVote(updated)
  }

  async remove(user: AuthUser, meetingId: string, voteId: string): Promise<void> {
    await this.access.assertManage(user, meetingId)
    const row = await this.findOwned(meetingId, voteId)
    this.assertStatus(row.status, 'DRAFT', '只有草稿可以删除')
    await this.prisma.$transaction(async (tx) => {
      const questions = (await tx.voteQuestion.findMany({
        where: { voteId: row.id },
        select: { id: true },
      })) as Array<{ id: string }>
      const ids = questions.map((item) => item.id)
      if (ids.length > 0) {
        await tx.voteOption.deleteMany({ where: { questionId: { in: ids } } })
        await tx.voteQuestion.deleteMany({ where: { id: { in: ids } } })
      }
      await tx.voteRecord.deleteMany({ where: { voteId: row.id } })
      await tx.vote.delete({ where: { id: row.id } })
    })
  }

  async start(user: AuthUser, meetingId: string, voteId: string): Promise<Vote> {
    await this.access.assertManage(user, meetingId)
    const row = await this.findOwned(meetingId, voteId)
    this.transition(row.status, 'ONGOING')
    const updated = (await this.prisma.vote.update({
      where: { id: row.id },
      data: { status: 'ONGOING', startedAt: new Date() },
      include: { questions: { include: { options: true } } },
    })) as unknown as VoteRow
    await this.meetings.appendEvent(meetingId, 'meeting.vote.started', user.id, {
      voteId: row.id,
      title: row.title,
    })
    return toVote(updated)
  }

  async close(user: AuthUser, meetingId: string, voteId: string): Promise<Vote> {
    await this.access.assertManage(user, meetingId)
    const row = await this.findOwned(meetingId, voteId)
    this.transition(row.status, 'CLOSED')
    const updated = (await this.prisma.vote.update({
      where: { id: row.id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { questions: { include: { options: true } } },
    })) as unknown as VoteRow
    const counted = await this.prisma.voteRecord.count({ where: { voteId: row.id } })
    await this.meetings.appendEvent(meetingId, 'meeting.vote.counted', user.id, {
      voteId: row.id,
      totalRecords: counted,
    })
    return toVote(updated)
  }

  async publish(user: AuthUser, meetingId: string, voteId: string): Promise<Vote> {
    await this.access.assertManage(user, meetingId)
    const row = await this.findOwned(meetingId, voteId)
    this.transition(row.status, 'PUBLISHED')
    const updated = (await this.prisma.vote.update({
      where: { id: row.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { questions: { include: { options: true } } },
    })) as unknown as VoteRow
    await this.meetings.appendEvent(meetingId, 'meeting.vote.published', user.id, {
      voteId: row.id,
    })
    return toVote(updated)
  }

  async submit(
    user: AuthUser,
    meetingId: string,
    voteId: string,
    input: SubmitVoteInput,
  ): Promise<VoteSubmissionResult> {
    await this.access.assertVisible(user, meetingId)
    const row = await this.findOwned(meetingId, voteId)
    if (row.status !== 'ONGOING') {
      throw new ApiError(ERROR_CODES.VOTE_INVALID_STATE, '投票未开始或已截止', 409)
    }
    this.validateAnswers(row.questions, input.answers)

    const existing = (await this.prisma.voteRecord.findUnique({
      where: { voteId_userId: { voteId: row.id, userId: user.id } },
    })) as { submittedAt: Date } | null
    if (existing !== null) {
      throw new ApiError(ERROR_CODES.VOTE_ALREADY_SUBMITTED, '已经投过票了', 409)
    }
    const created = (await this.prisma.voteRecord.create({
      data: {
        voteId: row.id,
        userId: user.id,
        answers: input.answers as unknown as object,
      },
    })) as unknown as { submittedAt: Date }
    const totalRecords = await this.prisma.voteRecord.count({ where: { voteId: row.id } })
    await this.meetings.appendEvent(meetingId, 'meeting.vote.counted', user.id, {
      voteId: row.id,
      totalRecords,
    })
    return {
      voteId: row.id,
      submittedAt: created.submittedAt.toISOString(),
      alreadySubmitted: false,
    }
  }

  async results(user: AuthUser, meetingId: string, voteId: string): Promise<VoteResults> {
    const meeting = await this.access.assertVisible(user, meetingId)
    const row = await this.findOwned(meetingId, voteId)
    if (row.status !== 'PUBLISHED' && !(await this.canManage(user, meeting, meetingId))) {
      throw new ApiError(ERROR_CODES.VOTE_INVALID_STATE, '结果尚未公布', 409)
    }
    const records = (await this.prisma.voteRecord.findMany({
      where: { voteId: row.id },
      select: { answers: true },
    })) as unknown as Array<{ answers: AnswerInput[] }>

    return {
      voteId: row.id,
      status: row.status,
      totalRecords: records.length,
      questions: row.questions
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((question) => {
          const counts = new Map<string, number>()
          const ratingCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
          for (const record of records) {
            const answer = record.answers.find((item) => item.questionId === question.id)
            if (answer === undefined) continue
            for (const optionId of answer.optionIds) {
              counts.set(optionId, (counts.get(optionId) ?? 0) + 1)
            }
            if (answer.rating !== undefined) {
              const key = String(answer.rating)
              if (key in ratingCounts) ratingCounts[key] = (ratingCounts[key] ?? 0) + 1
            }
          }
          return {
            questionId: question.id,
            content: question.content,
            type: question.type,
            options: question.options
              .slice()
              .sort((a, b) => a.index - b.index)
              .map((option) => ({
                optionId: option.id,
                content: option.content,
                count: counts.get(option.id) ?? 0,
              })),
            ratingCounts,
          }
        }),
    }
  }

  private validateAnswers(questions: QuestionRow[], answers: AnswerInput[]): void {
    const byId = new Map(questions.map((question) => [question.id, question]))
    const seen = new Set<string>()
    for (const answer of answers) {
      const question = byId.get(answer.questionId)
      if (question === undefined) {
        throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '题目不存在', 400)
      }
      if (seen.has(answer.questionId)) {
        throw new ApiError(10001, `题目 ${question.index} 重复作答`, 400)
      }
      seen.add(answer.questionId)
      const validIds = new Set(question.options.map((option) => option.id))
      if (question.type === 'RATING') {
        if (answer.rating === undefined) {
          throw new ApiError(10001, `题目 ${question.index} 需要 1-5 评分`, 400)
        }
        continue
      }
      const unique = new Set(answer.optionIds)
      if (unique.size !== answer.optionIds.length) {
        throw new ApiError(10001, `题目 ${question.index} 选项重复`, 400)
      }
      for (const optionId of answer.optionIds) {
        if (!validIds.has(optionId)) {
          throw new ApiError(10001, `题目 ${question.index} 含无效选项`, 400)
        }
      }
      if (question.type === 'SINGLE' && answer.optionIds.length !== 1) {
        throw new ApiError(10001, `题目 ${question.index} 是单选`, 400)
      }
      if (question.type === 'MULTI' && answer.optionIds.length === 0) {
        throw new ApiError(10001, `题目 ${question.index} 至少选一项`, 400)
      }
    }
    if (seen.size !== questions.length) {
      throw new ApiError(10001, '每道题都必须作答', 400)
    }
  }

  private transition(from: VoteState, to: VoteState): void {
    try {
      assertTransition(VOTE_TRANSITIONS, from, to)
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        throw new ApiError(
          ERROR_CODES.VOTE_INVALID_STATE,
          `投票当前状态（${from}）不能执行该操作`,
          409,
        )
      }
      throw error
    }
  }

  private assertStatus(status: VoteState, expected: VoteState, message: string): void {
    if (status !== expected) {
      throw new ApiError(ERROR_CODES.VOTE_INVALID_STATE, message, 409)
    }
  }

  private async canManage(
    user: AuthUser,
    meeting: { hostId: string },
    meetingId: string,
  ): Promise<boolean> {
    if (meeting.hostId === user.id) return true
    const participant = (await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: user.id } },
    })) as { role: string } | null
    return participant !== null && (participant.role === 'HOST' || participant.role === 'COHOST')
  }

  private async findOwned(meetingId: string, voteId: string): Promise<VoteRow> {
    const row = (await this.prisma.vote.findFirst({
      where: { id: voteId, meetingId },
      include: { questions: { include: { options: true } } },
    })) as unknown as VoteRow | null
    if (row === null) throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '投票不存在', 404)
    return row
  }
}
