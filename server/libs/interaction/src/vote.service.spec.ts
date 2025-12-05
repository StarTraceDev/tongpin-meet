import { describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '@tongpin/shared/types'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'
import type { MeetingService } from '../../meeting/src/meeting.service'

import { InteractionAccess } from './interaction-access'
import { VoteService } from './vote.service'

const host: AuthUser = {
  id: 'user_host',
  phone: '13800000000',
  name: '主持人',
  avatarUrl: null,
  roles: ['USER'],
  permissions: [],
}
const attendee: AuthUser = { ...host, id: 'user_2', name: '参会人', phone: '13800000001' }

function voteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'v_1',
    meetingId: 'm_1',
    title: '选个时间',
    status: 'DRAFT',
    anonymous: false,
    createdById: host.id,
    createdAt: new Date('2026-01-01T02:00:00.000Z'),
    startedAt: null,
    closedAt: null,
    publishedAt: null,
    questions: [
      {
        id: 'q_1',
        index: 1,
        content: '哪天方便',
        type: 'SINGLE',
        options: [
          { id: 'o_1', index: 1, content: '周一' },
          { id: 'o_2', index: 2, content: '周二' },
        ],
      },
    ],
    ...overrides,
  }
}

interface Mocks {
  voteCreate: ReturnType<typeof vi.fn>
  voteFindMany: ReturnType<typeof vi.fn>
  voteFindFirst: ReturnType<typeof vi.fn>
  voteUpdate: ReturnType<typeof vi.fn>
  voteDelete: ReturnType<typeof vi.fn>
  questionFindMany: ReturnType<typeof vi.fn>
  questionDeleteMany: ReturnType<typeof vi.fn>
  optionDeleteMany: ReturnType<typeof vi.fn>
  recordFindUnique: ReturnType<typeof vi.fn>
  recordCreate: ReturnType<typeof vi.fn>
  recordFindMany: ReturnType<typeof vi.fn>
  recordCount: ReturnType<typeof vi.fn>
  recordDeleteMany: ReturnType<typeof vi.fn>
  participantFindUnique: ReturnType<typeof vi.fn>
  meetingFindUnique: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
  appendEvent: ReturnType<typeof vi.fn>
}

function makeService(): { service: VoteService; mocks: Mocks } {
  const mocks: Mocks = {
    voteCreate: vi.fn(),
    voteFindMany: vi.fn(),
    voteFindFirst: vi.fn(),
    voteUpdate: vi.fn(),
    voteDelete: vi.fn(),
    questionFindMany: vi.fn(),
    questionDeleteMany: vi.fn(),
    optionDeleteMany: vi.fn(),
    recordFindUnique: vi.fn(),
    recordCreate: vi.fn(),
    recordFindMany: vi.fn(),
    recordCount: vi.fn(),
    recordDeleteMany: vi.fn(),
    participantFindUnique: vi.fn(),
    meetingFindUnique: vi.fn(),
    transaction: vi.fn(),
    appendEvent: vi.fn(async () => undefined),
  }
  const prisma = {
    vote: {
      create: mocks.voteCreate,
      findMany: mocks.voteFindMany,
      findFirst: mocks.voteFindFirst,
      update: mocks.voteUpdate,
      delete: mocks.voteDelete,
    },
    voteQuestion: {
      findMany: mocks.questionFindMany,
      deleteMany: mocks.questionDeleteMany,
    },
    voteOption: { deleteMany: mocks.optionDeleteMany },
    voteRecord: {
      findUnique: mocks.recordFindUnique,
      create: mocks.recordCreate,
      findMany: mocks.recordFindMany,
      count: mocks.recordCount,
      deleteMany: mocks.recordDeleteMany,
    },
    meetingParticipant: { findUnique: mocks.participantFindUnique },
    meeting: { findUnique: mocks.meetingFindUnique },
    $transaction: mocks.transaction,
  } as unknown as PrismaService
  mocks.transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: unknown) => unknown)(prisma)
      : Promise.all(arg as unknown[]),
  )
  const meetings = { appendEvent: mocks.appendEvent } as unknown as MeetingService
  return { service: new VoteService(prisma, new InteractionAccess(prisma), meetings), mocks }
}

describe('VoteService', () => {
  it('创建草稿时把题目与选项一起写入', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.voteCreate.mockResolvedValue(voteRow())
    const result = await service.create(host, 'm_1', {
      title: '选个时间',
      anonymous: false,
      questions: [
        {
          content: '哪天方便',
          type: 'SINGLE',
          options: [{ content: '周一' }, { content: '周二' }],
        },
      ],
    })
    expect(result.status).toBe('DRAFT')
    expect(mocks.voteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          questions: {
            create: [
              expect.objectContaining({
                index: 1,
                options: {
                  create: [
                    { index: 1, content: '周一' },
                    { index: 2, content: '周二' },
                  ],
                },
              }),
            ],
          },
        }),
      }),
    )
  })

  it('草稿状态不接受提交', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.voteFindFirst.mockResolvedValue(voteRow())
    await expect(
      service.submit(attendee, 'm_1', 'v_1', {
        answers: [{ questionId: 'q_1', optionIds: ['o_1'] }],
      }),
    ).rejects.toMatchObject({ status: 409, code: 30404 })
  })

  it('漏答题目返回 400', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.voteFindFirst.mockResolvedValue(voteRow({ status: 'ONGOING' }))
    await expect(
      service.submit(attendee, 'm_1', 'v_1', { answers: [] as never }),
    ).rejects.toMatchObject({ status: 400, code: 10001 })
  })

  it('开始投票广播 meeting.vote.started', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.voteFindFirst.mockResolvedValue(voteRow())
    mocks.voteUpdate.mockResolvedValue(voteRow({ status: 'ONGOING' }))
    const result = await service.start(host, 'm_1', 'v_1')
    expect(result.status).toBe('ONGOING')
    expect(mocks.appendEvent).toHaveBeenCalledWith(
      'm_1',
      'meeting.vote.started',
      host.id,
      expect.objectContaining({ voteId: 'v_1' }),
    )
  })

  it('重复投票返回 409', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.voteFindFirst.mockResolvedValue(voteRow({ status: 'ONGOING' }))
    mocks.recordFindUnique.mockResolvedValue({ submittedAt: new Date() })
    await expect(
      service.submit(attendee, 'm_1', 'v_1', {
        answers: [{ questionId: 'q_1', optionIds: ['o_1'] }],
      }),
    ).rejects.toMatchObject({ status: 409, code: 30405 })
  })

  it('结果未公布时普通参会人看不到，主持人可以看统计', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.voteFindFirst.mockResolvedValue(voteRow({ status: 'CLOSED' }))
    mocks.participantFindUnique.mockResolvedValue({ role: 'ATTENDEE' })
    await expect(service.results(attendee, 'm_1', 'v_1')).rejects.toMatchObject({
      status: 409,
      code: 30404,
    })

    mocks.recordFindMany.mockResolvedValue([
      { answers: [{ questionId: 'q_1', optionIds: ['o_1'] }] },
      { answers: [{ questionId: 'q_1', optionIds: ['o_1'] }] },
    ])
    const results = await service.results(host, 'm_1', 'v_1')
    expect(results.totalRecords).toBe(2)
    expect(results.questions[0]?.options[0]).toMatchObject({ optionId: 'o_1', count: 2 })
  })
})
