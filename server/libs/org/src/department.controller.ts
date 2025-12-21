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

import type { DeptNode } from '@tongpin/shared'

import { deptCreateSchema, deptUpdateSchema } from '../../../../packages/shared/src/schemas'

import { JwtAuthGuard } from '../../auth/src/jwt-auth.guard'
import { RequirePermissions } from '../../auth/src/rbac/permissions.decorator'
import { RbacGuard } from '../../auth/src/rbac/rbac.guard'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { DepartmentService } from './department.service'

class CreateDeptDto extends createZodDto(deptCreateSchema) {}
class UpdateDeptDto extends createZodDto(deptUpdateSchema) {}

/** 04 §6.2 组织域：部门树（06 §11.6） */
@Controller('departments')
@UseGuards(JwtAuthGuard, RbacGuard)
export class DepartmentController {
  constructor(private readonly departments: DepartmentService) {}

  @Get()
  @RequirePermissions('dept:write')
  tree(): Promise<{ items: DeptNode[] }> {
    return this.departments.tree()
  }

  @Post()
  @RequirePermissions('dept:write')
  async create(@Body() input: CreateDeptDto): Promise<{ department: DeptNode }> {
    return { department: await this.departments.create(input) }
  }

  @Patch(':id')
  @RequirePermissions('dept:write')
  async update(
    @Param('id') id: string,
    @Body() input: UpdateDeptDto,
  ): Promise<{ department: DeptNode }> {
    return { department: await this.departments.update(id, input) }
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('dept:write')
  remove(@Param('id') id: string): Promise<void> {
    return this.departments.remove(id)
  }
}
