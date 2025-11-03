/**
 * 03 §5.4 的状态机。后端 service 用它做流转校验，前端用它决定按钮禁用。
 * 不许在 controller / 组件里写 if (status === 'ONGOING')。
 */
import {
  FEEDBACK_STATUS,
  INTERACTION_STATUS,
  MEETING_STATUS,
  RECORDING_STATUS,
  VOTE_STATUS,
  type FeedbackStatus,
  type InteractionStatus,
  type MeetingStatus,
  type RecordingStatus,
  type VoteStatus,
} from './enums'

/** 状态 -> 允许流转到的下一批状态；空数组表示终态 */
export type TransitionMap<S extends string> = { readonly [K in S]: readonly S[] }

export const MEETING_TRANSITIONS: TransitionMap<MeetingStatus> = {
  [MEETING_STATUS.SCHEDULED]: [MEETING_STATUS.ONGOING, MEETING_STATUS.CANCELLED, MEETING_STATUS.EXPIRED],
  [MEETING_STATUS.ONGOING]: [MEETING_STATUS.ENDED],
  [MEETING_STATUS.ENDED]: [],
  [MEETING_STATUS.CANCELLED]: [],
  [MEETING_STATUS.EXPIRED]: [],
}

export const VOTE_TRANSITIONS: TransitionMap<VoteStatus> = {
  [VOTE_STATUS.DRAFT]: [VOTE_STATUS.ONGOING],
  [VOTE_STATUS.ONGOING]: [VOTE_STATUS.CLOSED],
  [VOTE_STATUS.CLOSED]: [VOTE_STATUS.PUBLISHED],
  [VOTE_STATUS.PUBLISHED]: [],
}

export const INTERACTION_TRANSITIONS: TransitionMap<InteractionStatus> = {
  [INTERACTION_STATUS.ONGOING]: [INTERACTION_STATUS.CLOSED],
  [INTERACTION_STATUS.CLOSED]: [],
}

export const FEEDBACK_TRANSITIONS: TransitionMap<FeedbackStatus> = {
  [FEEDBACK_STATUS.PENDING]: [FEEDBACK_STATUS.PROCESSING],
  [FEEDBACK_STATUS.PROCESSING]: [FEEDBACK_STATUS.RESOLVED, FEEDBACK_STATUS.REJECTED],
  [FEEDBACK_STATUS.RESOLVED]: [],
  [FEEDBACK_STATUS.REJECTED]: [],
}

export const RECORDING_TRANSITIONS: TransitionMap<RecordingStatus> = {
  [RECORDING_STATUS.REQUESTED]: [RECORDING_STATUS.RECORDING, RECORDING_STATUS.FAILED],
  [RECORDING_STATUS.RECORDING]: [RECORDING_STATUS.PROCESSING, RECORDING_STATUS.FAILED],
  [RECORDING_STATUS.PROCESSING]: [RECORDING_STATUS.READY, RECORDING_STATUS.FAILED],
  [RECORDING_STATUS.READY]: [],
  [RECORDING_STATUS.FAILED]: [],
}

export class IllegalTransitionError extends Error {
  constructor(
    readonly from: string,
    readonly to: string,
  ) {
    super(`不允许的状态流转：${from} → ${to}`)
    this.name = 'IllegalTransitionError'
  }
}

export function canTransition<S extends string>(map: TransitionMap<S>, from: S, to: S): boolean {
  return map[from].includes(to)
}

export function assertTransition<S extends string>(map: TransitionMap<S>, from: S, to: S): void {
  if (!canTransition(map, from, to)) {
    throw new IllegalTransitionError(from, to)
  }
}

/** 会议内的动作，和状态机分开：同一个状态可能既不能 join 也不能 end */
export const MEETING_ACTION = {
  JOIN: 'join',
  LEAVE: 'leave',
  UPDATE: 'update',
  CANCEL: 'cancel',
  DELETE: 'delete',
  END: 'end',
  INTERACT: 'interact',
} as const
export type MeetingAction = (typeof MEETING_ACTION)[keyof typeof MEETING_ACTION]

/** 03 §5.4 的「允许的动作」表；ENDED / CANCELLED / EXPIRED 只读 */
export const MEETING_ALLOWED_ACTIONS: Record<MeetingStatus, readonly MeetingAction[]> = {
  [MEETING_STATUS.SCHEDULED]: [
    MEETING_ACTION.JOIN,
    MEETING_ACTION.UPDATE,
    MEETING_ACTION.CANCEL,
    MEETING_ACTION.DELETE,
  ],
  [MEETING_STATUS.ONGOING]: [
    MEETING_ACTION.JOIN,
    MEETING_ACTION.LEAVE,
    MEETING_ACTION.END,
    MEETING_ACTION.INTERACT,
  ],
  [MEETING_STATUS.ENDED]: [],
  [MEETING_STATUS.CANCELLED]: [],
  [MEETING_STATUS.EXPIRED]: [],
}

export function canRunMeetingAction(status: MeetingStatus, action: MeetingAction): boolean {
  return MEETING_ALLOWED_ACTIONS[status].includes(action)
}

export const VOTE_ACTION = {
  START: 'start',
  SUBMIT: 'submit',
  CLOSE: 'close',
  PUBLISH: 'publish',
} as const
export type VoteAction = (typeof VOTE_ACTION)[keyof typeof VOTE_ACTION]

/** ONGOING 才收 submissions；CLOSED 后可 publish，但不能再改票 */
export const VOTE_ALLOWED_ACTIONS: Record<VoteStatus, readonly VoteAction[]> = {
  [VOTE_STATUS.DRAFT]: [VOTE_ACTION.START],
  [VOTE_STATUS.ONGOING]: [VOTE_ACTION.SUBMIT, VOTE_ACTION.CLOSE],
  [VOTE_STATUS.CLOSED]: [VOTE_ACTION.PUBLISH],
  [VOTE_STATUS.PUBLISHED]: [],
}

export function canRunVoteAction(status: VoteStatus, action: VoteAction): boolean {
  return VOTE_ALLOWED_ACTIONS[status].includes(action)
}
