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

import type { AlertRuleAction, AlertRuleList } from '../../../../packages/shared/src/types'
import {
  alertRuleCreateSchema,
  alertRuleUpdateSchema,
} from '../../../../packages/shared/src/schemas'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AlertRuleService } from './alert-rule.service'

class CreateRuleDto extends createZodDto(alertRuleCreateSchema) {}
class UpdateRuleDto extends createZodDto(alertRuleUpdateSchema) {}

/** 04 §6.8 管理台告警规则 */
@Controller('admin/alert-rules')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AlertRuleController {
  constructor(private readonly rules: AlertRuleService) {}

  @Get()
  @RequirePermissions('alert:read')
  list(): Promise<AlertRuleList> {
    return this.rules.list()
  }

  @Post()
  @RequirePermissions('alert:write')
  create(@Body() input: CreateRuleDto): Promise<AlertRuleAction> {
    return this.rules.create(input)
  }

  @Patch(':id')
  @RequirePermissions('alert:write')
  update(@Param('id') id: string, @Body() input: UpdateRuleDto): Promise<AlertRuleAction> {
    return this.rules.update(id, input)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('alert:write')
  remove(@Param('id') id: string): Promise<void> {
    return this.rules.remove(id)
  }
}
