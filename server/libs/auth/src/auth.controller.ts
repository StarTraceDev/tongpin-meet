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

import {
  sendSmsSchema,
  loginBySmsSchema,
  qrConfirmSchema,
} from '../../../../packages/shared/src/schemas'

import {
  loginByPasswordSchema,
  refreshSessionSchema,
} from '../../../../packages/shared/src/schemas'
import type {
  AuthSession,
  AuthUser,
  QrPoll,
  QrSession,
  SessionResponse,
} from '@tongpin/shared/types'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AuthService } from './auth.service'
import { CurrentSessionId, CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { QrSessionService } from './qr/qr-session.service'

class LoginByPasswordDto extends createZodDto(loginByPasswordSchema) {}
class RefreshSessionDto extends createZodDto(refreshSessionSchema) {}
class LoginBySmsDto extends createZodDto(loginBySmsSchema) {}
class SendSmsDto extends createZodDto(sendSmsSchema) {}
class QrConfirmDto extends createZodDto(qrConfirmSchema) {}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly qr: QrSessionService,
  ) {}

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

  // ---- 设备码 / 扫码登录（04 §6.1）----

  @Post('qrSessions')
  @HttpCode(200)
  createQrSession(): Promise<QrSession> {
    return this.qr.create()
  }

  @Get('qrSessions/:id')
  pollQrSession(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('user-agent') ua: string | undefined,
    @Headers('x-device-id') deviceId: string | undefined,
  ): Promise<QrPoll> {
    return this.qr.poll(id, { ip, ua, deviceId })
  }

  @Post('qrSessions/:id\\:confirm')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  confirmQrSession(
    @Param('id') id: string,
    @Body() body: QrConfirmDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.qr.confirm(id, body.code, user)
  }

  @Post('qrSessions/:id\\:reject')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  rejectQrSession(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.qr.reject(id, user)
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
