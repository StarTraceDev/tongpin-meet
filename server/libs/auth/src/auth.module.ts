import { Module } from '@nestjs/common'
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt'

import { PrismaModule } from '../../infra/src/prisma/prisma.module'

import { AuthController } from './auth.controller'
import { MockSmsPort } from './sms/mock-sms.port'
import { SmsCodeStore } from './sms/sms-code.store'
import { SMS_PORT } from './sms/sms.port'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { accessTtl, jwtSecret, TokenService } from './token.service'

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        signOptions: { expiresIn: accessTtl() as JwtSignOptions['expiresIn'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtAuthGuard,
    SmsCodeStore,
    { provide: SMS_PORT, useClass: MockSmsPort },
  ],
  exports: [AuthService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
