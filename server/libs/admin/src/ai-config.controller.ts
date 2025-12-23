import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import type {
  AiProviderAction,
  AiProviderList,
  AiRouteAction,
  AiRouteList,
  AiUsageList,
} from '@tongpin/shared/types'

import {
  aiProviderCreateSchema,
  aiProviderUpdateSchema,
  aiRouteCreateSchema,
  aiRouteUpdateSchema,
  aiUsageQuerySchema,
} from '../../../../packages/shared/src/schemas'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AiConfigService } from './ai-config.service'

class CreateProviderDto extends createZodDto(aiProviderCreateSchema) {}
class UpdateProviderDto extends createZodDto(aiProviderUpdateSchema) {}
class CreateRouteDto extends createZodDto(aiRouteCreateSchema) {}
class UpdateRouteDto extends createZodDto(aiRouteUpdateSchema) {}
class ListUsageDto extends createZodDto(aiUsageQuerySchema) {}

/** 04 §6.8 管理台 AI 配置；密钥只写不读，读权限 ai:read 即可看到掩码 */
@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AiConfigController {
  constructor(private readonly ai: AiConfigService) {}

  @Get('providers')
  @RequirePermissions('ai:read')
  providers(): Promise<AiProviderList> {
    return this.ai.providers()
  }

  @Post('providers')
  @RequirePermissions('ai:write')
  createProvider(@Body() input: CreateProviderDto): Promise<AiProviderAction> {
    return this.ai.createProvider(input)
  }

  @Patch('providers/:id')
  @RequirePermissions('ai:write')
  updateProvider(
    @Param('id') id: string,
    @Body() input: UpdateProviderDto,
  ): Promise<AiProviderAction> {
    return this.ai.updateProvider(id, input)
  }

  @Delete('providers/:id')
  @HttpCode(204)
  @RequirePermissions('ai:write')
  removeProvider(@Param('id') id: string): Promise<void> {
    return this.ai.removeProvider(id)
  }

  @Get('routes')
  @RequirePermissions('ai:read')
  routes(): Promise<AiRouteList> {
    return this.ai.routes()
  }

  @Post('routes')
  @RequirePermissions('ai:write')
  createRoute(@Body() input: CreateRouteDto): Promise<AiRouteAction> {
    return this.ai.createRoute(input)
  }

  @Patch('routes/:id')
  @RequirePermissions('ai:write')
  updateRoute(@Param('id') id: string, @Body() input: UpdateRouteDto): Promise<AiRouteAction> {
    return this.ai.updateRoute(id, input)
  }

  @Delete('routes/:id')
  @HttpCode(204)
  @RequirePermissions('ai:write')
  removeRoute(@Param('id') id: string): Promise<void> {
    return this.ai.removeRoute(id)
  }

  @Get('usage')
  @RequirePermissions('ai:read')
  usage(@Query() query: ListUsageDto): Promise<AiUsageList> {
    return this.ai.usage(query)
  }
}
