import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import { sendSmsSchema, loginBySmsSchema } from '../../../../packages/shared/src/schemas'

import {
  loginByPasswordSchema,
  refreshSessionSchema,
} from '../../../../packages/shared/src/schemas'
import type { AuthSession, AuthUser, SessionResponse } from '@tongpin/shared/types'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AuthService } from './auth.service'
import { CurrentSessionId, CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'

class LoginByPasswordDto extends createZodDto(loginByPasswordSchema) {}
class RefreshSessionDto extends createZodDto(refreshSessionSchema) {}
class LoginBySmsDto extends createZodDto(loginBySmsSchema) {}
class SendSmsDto extends createZodDto(sendSmsSchema) {}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Express 的 path-to-regexp 会把 `:` 当参数起点，AIP 风格的冒号必须转义
  @Post('sessions\\:password')
  @HttpCode(200)
  login(
    @Body() body: LoginByPasswordDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string | undefined,
    @Headers('x-device-id') deviceId: string | undefined,
  ): Promise<SessionResponse> {
    return this.auth.loginWithPassword(body, { ip, ua, deviceId })
  }

  @Post('sessions\\:refresh')
  @HttpCode(200)
  refresh(
    @Body() body: RefreshSessionDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string | undefined,
    @Headers('x-device-id') deviceId: string | undefined,
  ): Promise<SessionResponse> {
    return this.auth.refresh(body, { ip, ua, deviceId })
  }

  @Post('sessions\\:sms')
  @HttpCode(200)
  loginBySms(
    @Body() body: LoginBySmsDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string | undefined,
    @Headers('x-device-id') deviceId: string | undefined,
  ): Promise<SessionResponse> {
    return this.auth.loginWithSms(body, { ip, ua, deviceId })
  }

  @Post('smsCodes')
  @HttpCode(200)
  sendSms(@Body() body: SendSmsDto, @Ip() ip: string): Promise<{ sent: boolean }> {
    return this.auth.sendSmsCode(body.phone, ip).then(() => ({ sent: true }))
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() currentSessionId: string,
  ): Promise<AuthSession[]> {
    const sessions = await this.auth.listSessions(user.id)
    return sessions.map((session) => ({ ...session, current: session.id === currentSessionId }))
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() currentSessionId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.auth.revokeSession(user.id, id, currentSessionId)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user
  }
}
