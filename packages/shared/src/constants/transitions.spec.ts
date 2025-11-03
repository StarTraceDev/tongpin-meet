import { describe, expect, it } from 'vitest'

import {
  FEEDBACK_STATUS,
  INTERACTION_STATUS,
  MEETING_STATUS,
  RECORDING_STATUS,
  VOTE_STATUS,
} from '../constants/enums'
import {
  FEEDBACK_TRANSITIONS,
  INTERACTION_TRANSITIONS,
  IllegalTransitionError,
  MEETING_ACTION,
  MEETING_TRANSITIONS,
  RECORDING_TRANSITIONS,
  VOTE_ACTION,
  VOTE_TRANSITIONS,
  assertTransition,
  canRunMeetingAction,
  canRunVoteAction,
  canTransition,
} from './transitions'

describe('会议状态机', () => {
  it('SCHEDULED 可进 ONGOING / CANCELLED / EXPIRED', () => {
    expect(canTransition(MEETING_TRANSITIONS, MEETING_STATUS.SCHEDULED, MEETING_STATUS.ONGOING)).toBe(
      true,
    )
    expect(
      canTransition(MEETING_TRANSITIONS, MEETING_STATUS.SCHEDULED, MEETING_STATUS.CANCELLED),
    ).toBe(true)
    expect(
      canTransition(MEETING_TRANSITIONS, MEETING_STATUS.SCHEDULED, MEETING_STATUS.EXPIRED),
    ).toBe(true)
  })

  it('终态不可再流转', () => {
    for (const terminal of [
      MEETING_STATUS.ENDED,
      MEETING_STATUS.CANCELLED,
      MEETING_STATUS.EXPIRED,
    ]) {
      expect(
        canTransition(MEETING_TRANSITIONS, terminal, MEETING_STATUS.ONGOING),
      ).toBe(false)
    }
  })

  it('不许从 ENDED 回到 ONGOING', () => {
    expect(() =>
      assertTransition(MEETING_TRANSITIONS, MEETING_STATUS.ENDED, MEETING_STATUS.ONGOING),
    ).toThrow(IllegalTransitionError)
  })

  it('动作表按状态区分：SCHEDULED 不能 end，ONGOING 不能 cancel', () => {
    expect(canRunMeetingAction(MEETING_STATUS.SCHEDULED, MEETING_ACTION.END)).toBe(false)
    expect(canRunMeetingAction(MEETING_STATUS.ONGOING, MEETING_ACTION.CANCEL)).toBe(false)
    expect(canRunMeetingAction(MEETING_STATUS.ONGOING, MEETING_ACTION.INTERACT)).toBe(true)
    expect(canRunMeetingAction(MEETING_STATUS.ENDED, MEETING_ACTION.JOIN)).toBe(false)
  })
})

describe('投票状态机', () => {
  it('只能单向 DRAFT → ONGOING → CLOSED → PUBLISHED', () => {
    expect(canTransition(VOTE_TRANSITIONS, VOTE_STATUS.DRAFT, VOTE_STATUS.ONGOING)).toBe(true)
    expect(canTransition(VOTE_TRANSITIONS, VOTE_STATUS.ONGOING, VOTE_STATUS.CLOSED)).toBe(true)
    expect(canTransition(VOTE_TRANSITIONS, VOTE_STATUS.CLOSED, VOTE_STATUS.PUBLISHED)).toBe(true)
    expect(canTransition(VOTE_TRANSITIONS, VOTE_STATUS.PUBLISHED, VOTE_STATUS.CLOSED)).toBe(false)
    expect(canTransition(VOTE_TRANSITIONS, VOTE_STATUS.DRAFT, VOTE_STATUS.CLOSED)).toBe(false)
  })

  it('只有 ONGOING 收 submissions，只有 CLOSED 能 publish', () => {
    expect(canRunVoteAction(VOTE_STATUS.ONGOING, VOTE_ACTION.SUBMIT)).toBe(true)
    expect(canRunVoteAction(VOTE_STATUS.CLOSED, VOTE_ACTION.SUBMIT)).toBe(false)
    expect(canRunVoteAction(VOTE_STATUS.CLOSED, VOTE_ACTION.PUBLISH)).toBe(true)
    expect(canRunVoteAction(VOTE_STATUS.ONGOING, VOTE_ACTION.PUBLISH)).toBe(false)
  })
})

describe('签到 / 休息状态机', () => {
  it('单向关闭，不可重开', () => {
    expect(
      canTransition(INTERACTION_TRANSITIONS, INTERACTION_STATUS.ONGOING, INTERACTION_STATUS.CLOSED),
    ).toBe(true)
    expect(
      canTransition(INTERACTION_TRANSITIONS, INTERACTION_STATUS.CLOSED, INTERACTION_STATUS.ONGOING),
    ).toBe(false)
  })
})

describe('反馈状态机', () => {
  it('PROCESSING 可分叉到 RESOLVED / REJECTED，终态无出口', () => {
    expect(
      canTransition(FEEDBACK_TRANSITIONS, FEEDBACK_STATUS.PROCESSING, FEEDBACK_STATUS.RESOLVED),
    ).toBe(true)
    expect(
      canTransition(FEEDBACK_TRANSITIONS, FEEDBACK_STATUS.PROCESSING, FEEDBACK_STATUS.REJECTED),
    ).toBe(true)
    expect(canTransition(FEEDBACK_TRANSITIONS, FEEDBACK_STATUS.RESOLVED, FEEDBACK_STATUS.RESOLVED)).toBe(
      false,
    )
  })
})

describe('录制状态机', () => {
  it('主链 REQUESTED → RECORDING → PROCESSING → READY', () => {
    expect(
      canTransition(RECORDING_TRANSITIONS, RECORDING_STATUS.REQUESTED, RECORDING_STATUS.RECORDING),
    ).toBe(true)
    expect(
      canTransition(RECORDING_TRANSITIONS, RECORDING_STATUS.PROCESSING, RECORDING_STATUS.READY),
    ).toBe(true)
  })

  it('任一步可 FAILED，但 READY 之后不能再失败', () => {
    expect(
      canTransition(RECORDING_TRANSITIONS, RECORDING_STATUS.RECORDING, RECORDING_STATUS.FAILED),
    ).toBe(true)
    expect(
      canTransition(RECORDING_TRANSITIONS, RECORDING_STATUS.READY, RECORDING_STATUS.FAILED),
    ).toBe(false)
  })
})
