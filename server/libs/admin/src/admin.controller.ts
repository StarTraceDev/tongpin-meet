import { Controller, Get, UseGuards } from '@nestjs/common'

import type {
  AdminRoomList,
  AdminStatsOverview,
  AdminTrend,
  AdminUsage,
} from '@tongpin/shared/types'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AdminStatsService } from './admin-stats.service'

/** 04 §6.8 管理台只读接口；写接口随各自模块的里程碑再补。 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AdminController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get('stats/overview')
  @RequirePermissions('stats:read')
  overview(): Promise<AdminStatsOverview> {
    return this.stats.overview()
  }

  @Get('stats/meetings')
  @RequirePermissions('stats:read')
  meetingTrend(): Promise<AdminTrend> {
    return this.stats.meetingTrend()
  }

  @Get('stats/users')
  @RequirePermissions('stats:read')
  userGrowth(): Promise<AdminTrend> {
    return this.stats.userGrowth()
  }

  @Get('stats/usage')
  @RequirePermissions('stats:read')
  usage(): Promise<AdminUsage> {
    return this.stats.usage()
  }

  @Get('rooms')
  @RequirePermissions('meeting:read')
  rooms(): Promise<AdminRoomList> {
    return this.stats.rooms()
  }
}
