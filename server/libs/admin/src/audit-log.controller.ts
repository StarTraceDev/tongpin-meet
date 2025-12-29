import { Controller, Get, Header, Param, Query, UseGuards } from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import type { AuditLogItem, AuditLogList } from '../../../../packages/shared/src/types'
import { auditLogQuerySchema } from '../../../../packages/shared/src/schemas'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AuditLogService } from './audit-log.service'

class AuditLogQueryDto extends createZodDto(auditLogQuerySchema) {}

/** 04 §6.8 管理台审计日志（只读） */
@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AuditLogController {
  constructor(private readonly logs: AuditLogService) {}

  @Get('audit-logs')
  @RequirePermissions('audit:read')
  list(@Query() query: AuditLogQueryDto): Promise<AuditLogList> {
    return this.logs.list(query)
  }

  @Get('audit-logs\\:export')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="audit-logs.csv"')
  @RequirePermissions('audit:read')
  exportCsv(@Query() query: AuditLogQueryDto): Promise<string> {
    return this.logs.exportCsv(query)
  }

  @Get('audit-logs/:id')
  @RequirePermissions('audit:read')
  detail(@Param('id') id: string): Promise<AuditLogItem> {
    return this.logs.detail(id)
  }
}
