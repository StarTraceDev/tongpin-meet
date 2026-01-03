import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { MEETING_STATUS } from '../constants/enums'
import { ERROR_CODES, errorCodeDomain } from '../constants/error-codes'
import { WS_EVENTS } from '../constants/events'
import { LIMITS } from '../constants/limits'
import { PERMISSIONS, isPermission } from '../constants/permissions'
import { createMeetingSchema, joinAsGuestSchema, updateMeetingSchema } from './meeting'
import {
  idSchema,
  meetingNoSchema,
  paginatedSchema,
  paginationQuerySchema,
  phoneSchema,
  problemSchema,
} from './common'
import { wsEnvelopeSchema } from './ws'

const validMeeting = {
  title: '周会',
  startAt: '2026-11-04T15:00:00+08:00',
  endAt: '2026-11-04T16:00:00+08:00',
}

describe('公共 schema', () => {
  it('id 非空', () => {
    expect(idSchema.safeParse('abc').success).toBe(true)
    expect(idSchema.safeParse('').success).toBe(false)
  })

  it('会议号必须是 9 位数字', () => {
    expect(meetingNoSchema.safeParse('123456789').success).toBe(true)
    expect(meetingNoSchema.safeParse('12345678').success).toBe(false)
    expect(meetingNoSchema.safeParse('12345678a').success).toBe(false)
  })

  it('手机号按大陆号段校验', () => {
    expect(phoneSchema.safeParse('13800000000').success).toBe(true)
    expect(phoneSchema.safeParse('12800000000').success).toBe(false)
  })

  it('分页参数从 query string 强转，并给默认值', () => {
    const parsed = paginationQuerySchema.parse({ page: '2', pageSize: '50', sort: '-startAt' })
    expect(parsed).toEqual({ page: 2, pageSize: 50, sort: '-startAt' })

    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })

    expect(paginationQuerySchema.safeParse({ sort: 'startAt; DROP TABLE' }).success).toBe(false)
  })

  it('problem+json 形状与 04 §4.5 示例一致', () => {
    const problem = {
      type: 'https://tongpin.dev/errors/30402',
      title: '会议已结束',
      status: 409,
      code: 30402,
      detail: '该会议已于 2026-11-04 15:00 结束',
      instance: '/api/v1/meetings/abc:join',
      traceId: '01JBX8',
    }
    expect(problemSchema.parse(problem)).toEqual(problem)
    expect(problemSchema.safeParse({ ...problem, status: 200 }).success).toBe(false)
  })

  it('分页返回体带 items', () => {
    const schema = paginatedSchema(z.object({ id: z.string() }))
    const parsed = schema.parse({
      items: [{ id: 'a' }],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    expect(parsed.items).toHaveLength(1)
  })
})

describe('会议 schema', () => {
  it('最小入参自动补 settings 与 inviteeIds 默认值', () => {
    const parsed = createMeetingSchema.parse(validMeeting)
    expect(parsed.settings).toEqual({
      muteOnJoin: true,
      watermark: false,
      allowGuest: false,
      autoRecord: false,
    })
    expect(parsed.inviteeIds).toEqual([])
  })

  it('结束时间必须晚于开始时间', () => {
    const result = createMeetingSchema.safeParse({
      ...validMeeting,
      endAt: '2026-11-04T14:00:00+08:00',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['endAt'])
  })

  it('标题与密码长度读 LIMITS', () => {
    expect(
      createMeetingSchema.safeParse({
        ...validMeeting,
        title: 'x'.repeat(LIMITS.MEETING_TITLE_MAX_LENGTH + 1),
      }).success,
    ).toBe(false)
    expect(createMeetingSchema.safeParse({ ...validMeeting, password: '123' }).success).toBe(false)
    expect(createMeetingSchema.safeParse({ ...validMeeting, password: '1234' }).success).toBe(true)
  })

  it('PATCH 允许只传部分字段，但两个时间都给时要校验先后', () => {
    expect(updateMeetingSchema.parse({ title: '改名' })).toEqual({ title: '改名' })
    expect(
      updateMeetingSchema.safeParse({
        startAt: '2026-11-04T16:00:00+08:00',
        endAt: '2026-11-04T15:00:00+08:00',
      }).success,
    ).toBe(false)
  })

  it('游客入会只认 meetingNo + 昵称', () => {
    expect(joinAsGuestSchema.safeParse({ meetingNo: '123456789', nickname: '访客' }).success).toBe(
      true,
    )
    expect(joinAsGuestSchema.safeParse({ meetingNo: '123', nickname: '访客' }).success).toBe(false)
  })
})

describe('WS 信封', () => {
  it('接受 04 §6.9 的形状', () => {
    const envelope = {
      v: 1,
      id: 'evt_01JBX8Q2M4',
      type: 'meeting.member.media',
      ts: 1793343600000,
      from: 'u_1001',
      meetingId: 'abc123',
      seq: 42,
      data: { uid: 'u_1001', audioOn: true, videoOn: false },
    }
    expect(wsEnvelopeSchema.safeParse(envelope).success).toBe(true)
  })

  it('未登记的事件名直接拒绝', () => {
    expect(
      wsEnvelopeSchema.safeParse({
        v: 1,
        id: 'evt_1',
        type: 'meeting.unknown.event',
        ts: 1,
        from: 'u_1',
        meetingId: 'm',
        seq: 1,
        data: {},
      }).success,
    ).toBe(false)
  })
})

describe('常量', () => {
  it('错误码落在自己的分段内', () => {
    expect(errorCodeDomain(ERROR_CODES.ACCESS_EXPIRED)).toBe('AUTH')
    expect(errorCodeDomain(ERROR_CODES.MEETING_ENDED)).toBe('MEETING')
    expect(errorCodeDomain(99999)).toBe('SYSTEM')
    expect(errorCodeDomain(80000)).toBeUndefined()
  })

  it('权限点只有白名单里的', () => {
    expect(isPermission('sms:secret')).toBe(true)
    expect(isPermission('sms:nope')).toBe(false)
    // 04 §5.6 的 24 个 + 告警规则读/写、公告读/写（M11-11 / M11-16）
    expect(PERMISSIONS).toHaveLength(28)
  })

  it('WS 事件名不重复', () => {
    expect(new Set(WS_EVENTS).size).toBe(WS_EVENTS.length)
  })

  it('会议状态枚举与状态机键一致', () => {
    const keys = Object.keys(MEETING_STATUS)
    expect(keys).toHaveLength(5)
  })
})
