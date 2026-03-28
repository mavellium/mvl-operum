import { z } from 'zod'

export const CardCreateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, 'Título é obrigatório'),
  description: z.string().default(''),
  responsible: z.string().default(''),
  responsibleId: z.string().optional(),
  color: z.string().default('#6b7280'),
  position: z.number().int().min(0),
  columnId: z.string().min(1, 'columnId é obrigatório'),
  sprintId: z.string().optional(),
})

export const CardUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  responsible: z.string().optional(),
  responsibleId: z.string().nullable().optional(),
  color: z.string().optional(),
  sprintId: z.string().nullable().optional(),
})

export type CardCreateInput = z.infer<typeof CardCreateSchema>
export type CardUpdateInput = z.infer<typeof CardUpdateSchema>
