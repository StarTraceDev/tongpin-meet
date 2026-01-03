import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import type { AuthUser } from '../../../../packages/shared/src/types'
import type { AnnouncementAction, AnnouncementList } from '../../../../packages/shared/src/types'
import {
  announcementCreateSchema,
  announcementQuerySchema,
  announcementUpdateSchema,
} from '../../../../packages/shared/src/schemas'

import { CurrentUser } from '../../auth/src/current-user.decorator'
import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { AnnouncementService } from './announcement.service'

class ListAnnouncementsDto extends createZodDto(announcementQuerySchema) {}
class CreateAnnouncementDto extends createZodDto(announcementCreateSchema) {}
class UpdateAnnouncementDto extends createZodDto(announcementUpdateSchema) {}

/** 04 §6.8 系统公告 */
@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AnnouncementController {
  constructor(private readonly announcements: AnnouncementService) {}

  @Get()
  @RequirePermissions('announcement:read')
  list(@Query() query: ListAnnouncementsDto): Promise<AnnouncementList> {
    return this.announcements.list(query)
  }

  @Post()
  @RequirePermissions('announcement:write')
  create(
    @Body() input: CreateAnnouncementDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AnnouncementAction> {
    return this.announcements.create(input, user.id)
  }

  @Patch(':id')
  @RequirePermissions('announcement:write')
  update(
    @Param('id') id: string,
    @Body() input: UpdateAnnouncementDto,
  ): Promise<AnnouncementAction> {
    return this.announcements.update(id, input)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('announcement:write')
  remove(@Param('id') id: string): Promise<void> {
    return this.announcements.remove(id)
  }
}
