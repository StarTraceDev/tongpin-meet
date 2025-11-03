/**
 * 04 §6.9 的 WS 事件名，域.资源.动作。
 * 注意 C1（服务端 WS，要落库）与 C2（LiveKit DataChannel，不落库）共用命名空间，
 * 但只有 C1 的事件会出现在这里的服务端广播清单里。
 */
export const WS_EVENTS = [
  'meeting.member.joined',
  'meeting.member.left',
  'meeting.member.media',
  'meeting.member.renamed',
  'meeting.member.kicked',
  'meeting.media.mute-all',
  'meeting.media.controlled',
  'meeting.host.transferred',
  'meeting.host.regained',
  'meeting.checkin.started',
  'meeting.checkin.closed',
  'meeting.checkin.recorded',
  'meeting.vote.started',
  'meeting.vote.counted',
  'meeting.vote.published',
  'meeting.break.started',
  'meeting.break.ended',
  'meeting.break.member-changed',
  'meeting.recording.requested',
  'meeting.recording.decided',
  'meeting.recording.started',
  'meeting.recording.stopped',
  'meeting.whiteboard.synced',
  'meeting.whiteboard.chunk',
  'meeting.chat.message',
  'room.snapshot',
  'room.joined',
  'room.error',
  'sys.ping',
  'sys.pong',
] as const

export type WsEvent = (typeof WS_EVENTS)[number]

/** 三通道分工（04 §6.9）：只有 C1 由服务端广播并落库 */
export const WS_CHANNEL = {
  SERVER: 'C1',
  LIVEKIT_DATA: 'C2',
  HTTP: 'C3',
} as const
