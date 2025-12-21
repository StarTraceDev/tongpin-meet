import { z } from 'zod'

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
