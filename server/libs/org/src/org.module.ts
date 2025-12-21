import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'

import { DepartmentController } from './department.controller'
import { DepartmentService } from './department.service'
import { RoleOptionsController, UserController } from './user.controller'
import { AdminUsersService } from './user.service'

@Module({
  imports: [AuthModule],
  controllers: [UserController, RoleOptionsController, DepartmentController],
  providers: [AdminUsersService, DepartmentService],
})
export class OrgModule {}
