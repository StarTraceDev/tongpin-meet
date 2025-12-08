import { createZodDto } from 'nestjs-zod'

import { updateMinutesSchema } from '../../../../../packages/shared/src/schemas'

export class UpdateMinutesDto extends createZodDto(updateMinutesSchema) {}
