import { z } from 'zod'

import { PERMISSIONS } from '../constants/permissions'

import { isoDateTimeSchema } from './common'

/** 04 §6.2 组织域：部门树（06 §11.6） */
export interface DeptNode {
  id: string
  name: string
  parentId: string | null
  sort: number
  children: DeptNode[]
}

export const deptNameSchema = z
  .string()
  .trim()
  .min(1, '请填写部门名称')
  .max(20, '部门名称最多 20 字')

export const deptCreateSchema = z.object({
  name: deptNameSchema,
  parentId: z.string().min(1).nullable().optional(),
  sort: z.int().min(0).max(9999).default(0),
})

export const deptUpdateSchema = z.object({
  name: deptNameSchema.optional(),
  parentId: z.string().min(1).nullable().optional(),
  sort: z.int().min(0).max(9999).optional(),
})

export const deptSchema: z.ZodType<DeptNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    parentId: z.string().nullable(),
    sort: z.int(),
    children: z.array(deptSchema),
  }),
)

export const deptTreeSchema = z.object({
  items: z.array(deptSchema),
})

export const deptActionSchema = z.object({
  department: deptSchema,
})

/** 04 §6.2 组织域：角色与权限点（06 §11.7） */
export const permissionSchema = z.enum(PERMISSIONS)

export const roleItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  permissions: z.array(permissionSchema),
  builtin: z.boolean(),
  userCount: z.int().nonnegative(),
  createdAt: isoDateTimeSchema,
})

export const roleListSchema = z.object({
  items: z.array(roleItemSchema),
})

export const roleCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .transform((value) => value.toUpperCase())
    .pipe(
      z
        .string()
        .regex(/^[A-Z][A-Z0-9_]{1,31}$/, '角色编码只能用大写字母、数字和下划线，且以字母开头'),
    ),
  name: z.string().trim().min(1, '请填写角色名称').max(20, '角色名称最多 20 字'),
  permissions: z.array(permissionSchema).default([]),
})

export const roleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(20).optional(),
  permissions: z.array(permissionSchema).optional(),
})

export const roleActionSchema = z.object({
  role: roleItemSchema,
})

export const permissionListSchema = z.object({
  items: z.array(permissionSchema),
})
