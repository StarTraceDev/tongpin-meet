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
  SmsLogList,
  SmsProviderAction,
  SmsProviderList,
  SmsTemplateAction,
  SmsTemplateList,
} from '@tongpin/shared/types'

import {
  smsLogsQuerySchema,
  smsProviderCreateSchema,
  smsProviderUpdateSchema,
  smsTemplateCreateSchema,
  smsTemplateUpdateSchema,
} from '../../../../packages/shared/src/schemas'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { SmsConfigService } from './sms-config.service'

class CreateProviderDto extends createZodDto(smsProviderCreateSchema) {}
class UpdateProviderDto extends createZodDto(smsProviderUpdateSchema) {}
class CreateTemplateDto extends createZodDto(smsTemplateCreateSchema) {}
class UpdateTemplateDto extends createZodDto(smsTemplateUpdateSchema) {}
class ListLogsDto extends createZodDto(smsLogsQuerySchema) {}

/** 04 §6.8 管理台短信配置；密钥只写不读，查看权限有 sms:read 即够（返回值只有掩码） */
@Controller('admin/sms')
@UseGuards(JwtAuthGuard, RbacGuard)
export class SmsConfigController {
  constructor(private readonly sms: SmsConfigService) {}

  @Get('providers')
  @RequirePermissions('sms:read')
  providers(): Promise<SmsProviderList> {
    return this.sms.providers()
  }

  @Post('providers')
  @RequirePermissions('sms:write')
  createProvider(@Body() input: CreateProviderDto): Promise<SmsProviderAction> {
    return this.sms.createProvider(input)
  }

  @Patch('providers/:id')
  @RequirePermissions('sms:write')
  updateProvider(
    @Param('id') id: string,
    @Body() input: UpdateProviderDto,
  ): Promise<SmsProviderAction> {
    return this.sms.updateProvider(id, input)
  }

  @Delete('providers/:id')
  @HttpCode(204)
  @RequirePermissions('sms:write')
  removeProvider(@Param('id') id: string): Promise<void> {
    return this.sms.removeProvider(id)
  }

  @Get('templates')
  @RequirePermissions('sms:read')
  templates(): Promise<SmsTemplateList> {
    return this.sms.templates()
  }

  @Post('templates')
  @RequirePermissions('sms:write')
  createTemplate(@Body() input: CreateTemplateDto): Promise<SmsTemplateAction> {
    return this.sms.createTemplate(input)
  }

  @Patch('templates/:id')
  @RequirePermissions('sms:write')
  updateTemplate(
    @Param('id') id: string,
    @Body() input: UpdateTemplateDto,
  ): Promise<SmsTemplateAction> {
    return this.sms.updateTemplate(id, input)
  }

  @Delete('templates/:id')
  @HttpCode(204)
  @RequirePermissions('sms:write')
  removeTemplate(@Param('id') id: string): Promise<void> {
    return this.sms.removeTemplate(id)
  }

  @Get('logs')
  @RequirePermissions('sms:read')
  logs(@Query() query: ListLogsDto): Promise<SmsLogList> {
    return this.sms.logs(query)
  }
}
