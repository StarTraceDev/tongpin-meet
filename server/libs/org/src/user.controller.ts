import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import type { AdminUserAction, AdminUserItem, AdminUserList } from '@tongpin/shared/types'

import {
  adminResetPasswordSchema,
  adminUserCreateSchema,
  adminUserRolesSchema,
  adminUsersQuerySchema,
  adminUserUpdateSchema,
} from '../../../../packages/shared/src/schemas'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AdminUsersService } from './user.service'

class ListUsersDto extends createZodDto(adminUsersQuerySchema) {}
class CreateUserDto extends createZodDto(adminUserCreateSchema) {}
class UpdateUserDto extends createZodDto(adminUserUpdateSchema) {}
class SetRolesDto extends createZodDto(adminUserRolesSchema) {}
class ResetPasswordDto extends createZodDto(adminResetPasswordSchema) {}

/** 04 §6.2 组织域的用户接口；权限点来自 03 §5.6 */
@Controller('users')
@UseGuards(JwtAuthGuard, RbacGuard)
export class UserController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @RequirePermissions('user:read')
  list(@Query() query: ListUsersDto): Promise<AdminUserList> {
    return this.users.list(query)
  }

  @Post()
  @RequirePermissions('user:write')
  create(@Body() input: CreateUserDto): Promise<AdminUserItem> {
    return this.users.create(input)
  }

  @Patch(':id')
  @RequirePermissions('user:write')
  update(@Param('id') id: string, @Body() input: UpdateUserDto): Promise<AdminUserItem> {
    return this.users.update(id, input)
  }

  @Post(':id\\:disable')
  @RequirePermissions('user:disable')
  async disable(@Param('id') id: string): Promise<AdminUserAction> {
    return { user: await this.users.disable(id) }
  }

  @Post(':id\\:enable')
  @RequirePermissions('user:disable')
  async enable(@Param('id') id: string): Promise<AdminUserAction> {
    return { user: await this.users.enable(id) }
  }

  @Post(':id\\:resetPassword')
  @HttpCode(204)
  @RequirePermissions('user:resetPwd')
  resetPassword(@Param('id') id: string, @Body() input: ResetPasswordDto): Promise<void> {
    return this.users.resetPassword(id, input.password)
  }

  @Put(':id/roles')
  @RequirePermissions('role:write')
  async setRoles(@Param('id') id: string, @Body() input: SetRolesDto): Promise<AdminUserAction> {
    return { user: await this.users.setRoles(id, input.roleIds) }
  }
}
