import { z } from 'zod'

import { WS_EVENTS } from '../constants/events'

/** 04 §6.9 的信封；data 的具体形状由各事件的 schema 决定 */
export const wsEnvelopeSchema = z.object({
  v: z.literal(1),
  id: z.string().min(1),
  type: z.enum(WS_EVENTS),
  ts: z.int().nonnegative(),
  from: z.string().min(1),
  meetingId: z.string().min(1),
  seq: z.int().nonnegative(),
  data: z.unknown(),
})

export const wsTicketSchema = z.object({
  ticket: z.string().min(1),
  expiresAt: z.iso.datetime({ offset: true }),
})
