import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'

import { DepartmentController } from './department.controller'
import { DepartmentService } from './department.service'
import { PermissionController, RoleController } from './role.controller'
import { RolesService } from './role.service'
import { UserController } from './user.controller'
import { AdminUsersService } from './user.service'

@Module({
  imports: [AuthModule],
  controllers: [UserController, RoleController, PermissionController, DepartmentController],
  providers: [AdminUsersService, RolesService, DepartmentService],
})
export class OrgModule {}
