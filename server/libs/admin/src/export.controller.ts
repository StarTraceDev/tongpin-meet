import { Controller, Get, Header, Param, Query, UseGuards } from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type { AuthUser, ExportResource } from '../../../../packages/shared/src/types'
import type {
  ExportOperationAction,
  ExportOperationItem,
  ExportOperationList,
} from '../../../../packages/shared/src/types'
import { exportOperationQuerySchema } from '../../../../packages/shared/src/schemas'

import { ApiError } from '../../common/src/errors/api-error'
import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { ExportService } from './export.service'

class ExportQueryDto extends createZodDto(exportOperationQuerySchema) {}

const RESOURCE_PERMISSION: Record<ExportResource, string> = {
  meetings: 'meeting:export',
  users: 'user:read',
  'audit-logs': 'audit:read',
  feedbacks: 'feedback:read',
}

function isExportResource(value: string): value is ExportResource {
  return (
    value === 'meetings' || value === 'users' || value === 'audit-logs' || value === 'feedbacks'
  )
}

/** 06 §11.17 通用导出：202 建任务 + 下载中心 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ExportController {
  constructor(private readonly exports: ExportService) {}

  @Get(':resource\\:export')
  start(
    @Param('resource') resource: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ExportOperationAction> {
    if (!isExportResource(resource)) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '未知导出资源', 404)
    }
    const permission = RESOURCE_PERMISSION[resource]
    const allowed = user.roles.includes('SUPER_ADMIN') || user.permissions.includes(permission)
    if (!allowed) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '没有该资源的导出权限', 403)
    }
    return this.exports.start(resource, user.id)
  }

  @Get('exports')
  @RequirePermissions('stats:read')
  list(@Query() query: ExportQueryDto): Promise<ExportOperationList> {
    return this.exports.list(query)
  }

  @Get('exports/:id')
  @RequirePermissions('stats:read')
  detail(@Param('id') id: string): Promise<ExportOperationItem> {
    return this.exports.detail(id)
  }

  @Get('exports/:id/file')
  @RequirePermissions('stats:read')
  @Header('content-type', 'text/csv; charset=utf-8')
  async file(@Param('id') id: string): Promise<string> {
    const { content } = await this.exports.download(id)
    return content
  }
}
