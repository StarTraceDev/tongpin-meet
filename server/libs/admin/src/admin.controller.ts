import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'

import { createZodDto } from 'nestjs-zod'

import type {
  AdminMeetingAction,
  AdminMeetingList,
  AdminRoomList,
  AdminStatsOverview,
  AdminTrend,
  AdminUsage,
} from '@tongpin/shared/types'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { adminMeetingsQuerySchema } from '../../../../packages/shared/src/schemas'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AdminMeetingsService } from './admin-meetings.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AdminStatsService } from './admin-stats.service'

class ListAdminMeetingsDto extends createZodDto(adminMeetingsQuerySchema) {}

/** 04 §6.8 管理台只读接口；写接口随各自模块的里程碑再补。 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AdminController {
  constructor(
    private readonly stats: AdminStatsService,
    private readonly meetings: AdminMeetingsService,
  ) {}

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

  @Get('meetings')
  @RequirePermissions('meeting:read')
  meetingList(@Query() query: ListAdminMeetingsDto): Promise<AdminMeetingList> {
    return this.meetings.list(query)
  }

  @Post('meetings/:id\\:forceEnd')
  @RequirePermissions('meeting:forceEnd')
  async forceEnd(@Param('id') id: string): Promise<AdminMeetingAction> {
    return { meeting: await this.meetings.forceEnd(id) }
  }
}
