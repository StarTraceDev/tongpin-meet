import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'

import { AdminController } from './admin.controller'
import { AdminStatsService } from './admin-stats.service'

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminStatsService],
})
export class AdminModule {}
