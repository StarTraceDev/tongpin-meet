import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'

import type { AuthUser, Minutes } from '@tongpin/shared/types'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- 管道靠 metatype 上的 schema 校验
import { UpdateMinutesDto } from './dto/update-minutes.dto'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { MinutesService } from './minutes.service'

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MinutesController {
  constructor(private readonly minutes: MinutesService) {}

  @Get(':id/minutes')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Minutes> {
    return this.minutes.get(user, id)
  }

  @Patch(':id/minutes')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateMinutesDto,
  ): Promise<Minutes> {
    return this.minutes.update(user, id, body)
  }

  @Post(':id/minutes\\:generate')
  @HttpCode(202)
  generate(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Minutes> {
    return this.minutes.generate(user, id)
  }
}
