import { z } from 'zod'

import { LIMITS } from '../constants/limits'
import { idSchema, isoDateTimeSchema } from './common'

export const FILE_PART_SIZE_BYTES = LIMITS.UPLOAD_PART_SIZE_MB * 1024 * 1024

export const createUploadSchema = z.object({
  meetingId: idSchema,
  name: z.string().trim().min(1).max(255),
  sizeBytes: z
    .int()
    .min(1)
    .max(LIMITS.FILE_MAX_SIZE_MB * 1024 * 1024),
  mime: z.string().trim().max(120).optional(),
})

export const uploadPartSchema = z.object({
  index: z.int().min(1),
})

export const fileStatusSchema = z.enum(['UPLOADING', 'READY'])

export const meetingFileSchema = z.object({
  id: idSchema,
  meetingId: idSchema,
  uploaderId: idSchema,
  name: z.string(),
  mime: z.string().nullable(),
  sizeBytes: z.int().nonnegative(),
  status: fileStatusSchema,
  createdAt: isoDateTimeSchema,
})

export const uploadSessionSchema = z.object({
  fileId: idSchema,
  partSize: z.int().positive(),
  parts: z.array(z.object({ index: z.int().min(1), sizeBytes: z.int().positive() })),
})

export const downloadUrlSchema = z.object({
  url: z.string().url(),
  expiresAt: isoDateTimeSchema,
})
