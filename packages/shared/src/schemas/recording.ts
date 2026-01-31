import { z } from 'zod'

import { idSchema, isoDateTimeSchema } from './common'

export const recordingStatusSchema = z.enum([
  'REQUESTED',
  'RECORDING',
  'PROCESSING',
  'READY',
  'FAILED',
])

export const recordingSchema = z.object({
  id: idSchema,
  meetingId: idSchema,
  meetingTitle: z.string(),
  startedById: idSchema,
  status: recordingStatusSchema,
  durationSec: z.int().nonnegative().nullable(),
  sizeBytes: z.int().nonnegative().nullable(),
  startedAt: isoDateTimeSchema,
  stoppedAt: isoDateTimeSchema.nullable(),
})

export const recordingListSchema = z.object({
  items: z.array(recordingSchema),
  total: z.number().int().nonnegative(),
})

export const recordingSegmentSchema = z.object({
  id: idSchema,
  index: z.int().positive(),
  startSec: z.int().nonnegative().nullable(),
  endSec: z.int().nonnegative().nullable(),
  sizeBytes: z.int().nonnegative().nullable(),
})

export const recordingDetailSchema = recordingSchema.extend({
  segments: z.array(recordingSegmentSchema),
})
