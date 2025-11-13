import { Body, Controller, Get, Headers, HttpCode, Ip, Post, UseGuards } from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import {
  loginByPasswordSchema,
  refreshSessionSchema,
} from '../../../../packages/shared/src/schemas'
import type { AuthUser, SessionResponse } from '@tongpin/shared/types'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'

class LoginByPasswordDto extends createZodDto(loginByPasswordSchema) {}
class RefreshSessionDto extends createZodDto(refreshSessionSchema) {}

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user
  }
}
