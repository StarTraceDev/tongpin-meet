import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import type { Costs } from '../../../../packages/shared/src/types'
import { costQuerySchema } from '../../../../packages/shared/src/schemas'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { CostService } from './cost.service'

class CostsQueryDto extends createZodDto(costQuerySchema) {}

/** 04 §6.8 管理台成本统计 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CostController {
  constructor(private readonly costs: CostService) {}

  @Get('costs')
  @RequirePermissions('cost:read')
  list(@Query() query: CostsQueryDto): Promise<Costs> {
    return this.costs.costs(query.days)
  }
}
