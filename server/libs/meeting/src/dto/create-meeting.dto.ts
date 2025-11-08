import { createZodDto } from 'nestjs-zod'

import { createMeetingSchema } from '@tongpin/shared/schemas'

/** 04 §4.2：zod schema 是唯一真源，DTO 只是给 Nest 的参数元数据用 */
export class CreateMeetingDto extends createZodDto(createMeetingSchema) {}
