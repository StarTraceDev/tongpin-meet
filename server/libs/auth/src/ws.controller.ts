import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common'

import type { AuthUser } from '@tongpin/shared/types'

import { signWsTicket } from '../../common/src/ws/ticket'
import { CurrentSessionId } from './current-user.decorator'
import { CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'
import { jwtSecret } from './token.service'

@Controller('ws')
export class WsController {
  /** 04 §6.9：只认 short-lived ticket，不把 token 放 URL（会进 access log） */
  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  ticket(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() sessionId: string,
  ): { ticket: string; expiresAt: string } {
    return signWsTicket(jwtSecret(), user.id, sessionId)
  }
}
