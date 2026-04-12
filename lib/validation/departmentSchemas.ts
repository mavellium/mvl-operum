import { z } from 'zod'

export const CreateDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  tenantId: z.string().min(1, 'TenantId is required'),
  description: z.string().trim().optional(),
  hourlyRate: z.number().min(0, 'Hourly rate cannot be negative').optional(),
})

export const UpdateDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
  hourlyRate: z.number().min(0, 'Hourly rate cannot be negative').optional(),
})

export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>
