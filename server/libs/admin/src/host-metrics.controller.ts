import { Controller, Get, UseGuards } from '@nestjs/common'

import type { HostMetrics } from '../../../../packages/shared/src/types'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { HostMetricsService } from './host-metrics.service'

/** 04 §6.8 管理台主机监控；指标来源见 service 注释，权限复用仪表盘的 stats:read */
@Controller('admin/metrics')
@UseGuards(JwtAuthGuard, RbacGuard)
export class HostMetricsController {
  constructor(private readonly metrics: HostMetricsService) {}

  @Get('hosts')
  @RequirePermissions('stats:read')
  sample(): Promise<HostMetrics> {
    return this.metrics.sample()
  }
}
