import { z } from 'zod'

import { PARTICIPANT_ROLE } from '../constants/enums'

export const participantRoleSchema = z.enum(PARTICIPANT_ROLE)

/** 03 §5.3：mediaState 是 Json，记参会人当前音视频状态 */
export const mediaStateSchema = z.object({
  audioOn: z.boolean().default(false),
  videoOn: z.boolean().default(false),
  screenSharing: z.boolean().default(false),
})
