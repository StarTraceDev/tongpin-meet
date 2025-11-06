import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; app: string } {
    return { status: 'ok', app: 'ai' }
  }
}
