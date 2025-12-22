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

import type { RoleAction, RoleList } from '@tongpin/shared/types'
import type { Permission } from '@tongpin/shared/constants'

import { roleCreateSchema, roleUpdateSchema } from '../../../../packages/shared/src/schemas'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { RolesService } from './role.service'

class CreateRoleDto extends createZodDto(roleCreateSchema) {}
class UpdateRoleDto extends createZodDto(roleUpdateSchema) {}

/** 04 §6.2 组织域：角色与权限点（06 §11.7） */
@Controller('roles')
@UseGuards(JwtAuthGuard, RbacGuard)
export class RoleController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions('user:read')
  list(): Promise<RoleList> {
    return this.roles.list()
  }

  @Post()
  @RequirePermissions('role:write')
  create(@Body() input: CreateRoleDto): Promise<RoleAction> {
    return this.roles.create(input)
  }

  @Patch(':id')
  @RequirePermissions('role:write')
  update(@Param('id') id: string, @Body() input: UpdateRoleDto): Promise<RoleAction> {
    return this.roles.update(id, input)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('role:write')
  remove(@Param('id') id: string): Promise<void> {
    return this.roles.remove(id)
  }
}

@Controller('permissions')
@UseGuards(JwtAuthGuard, RbacGuard)
export class PermissionController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions('permission:read')
  list(): Promise<Permission[]> {
    return this.roles.permissions()
  }
}
