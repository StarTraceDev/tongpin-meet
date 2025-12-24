import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import type { AuthUser } from '../../../../packages/shared/src/types'
import type {
  ConfigAction,
  ConfigList,
  FeatureFlagAction,
  FeatureFlagList,
} from '../../../../packages/shared/src/types'
import {
  configCreateSchema,
  configUpdateSchema,
  featureFlagUpdateSchema,
} from '../../../../packages/shared/src/schemas'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { ConfigService } from './config.service'

class CreateConfigDto extends createZodDto(configCreateSchema) {}
class UpdateConfigDto extends createZodDto(configUpdateSchema) {}
class UpdateFlagDto extends createZodDto(featureFlagUpdateSchema) {}

/** 04 §6.8 管理台系统配置与功能开关 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ConfigController {
  constructor(private readonly configs: ConfigService) {}

  @Get('configs')
  @RequirePermissions('config:read')
  list(): Promise<ConfigList> {
    return this.configs.configs()
  }

  @Post('configs')
  @RequirePermissions('config:write')
  create(@Body() input: CreateConfigDto, @CurrentUser() user: AuthUser): Promise<ConfigAction> {
    return this.configs.create(input, user.id)
  }

  @Patch('configs/:key')
  @RequirePermissions('config:write')
  update(
    @Param('key') key: string,
    @Body() input: UpdateConfigDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ConfigAction> {
    return this.configs.update(key, input, user.id)
  }

  @Delete('configs/:key')
  @HttpCode(204)
  @RequirePermissions('config:write')
  remove(@Param('key') key: string): Promise<void> {
    return this.configs.remove(key)
  }

  @Get('feature-flags')
  @RequirePermissions('config:read')
  flags(): Promise<FeatureFlagList> {
    return this.configs.flags()
  }

  @Patch('feature-flags/:key')
  @RequirePermissions('config:write')
  updateFlag(@Param('key') key: string, @Body() input: UpdateFlagDto): Promise<FeatureFlagAction> {
    return this.configs.updateFlag(key, input)
  }
}
