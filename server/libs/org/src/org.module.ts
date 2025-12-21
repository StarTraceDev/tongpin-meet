import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'

import { RoleOptionsController, UserController } from './user.controller'
import { AdminUsersService } from './user.service'

@Module({
  imports: [AuthModule],
  controllers: [UserController, RoleOptionsController],
  providers: [AdminUsersService],
})
export class OrgModule {}
