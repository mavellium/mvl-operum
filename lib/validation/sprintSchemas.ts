import { z } from 'zod'

const SprintStatusEnum = z.enum(['PLANNED', 'ACTIVE', 'COMPLETED'])

export const SprintCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome do sprint é obrigatório'),
    boardId: z.string().min(1, 'boardId é obrigatório'),
    status: SprintStatusEnum.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate
      }
      return true
    },
    { message: 'Data de fim deve ser após a data de início', path: ['endDate'] },
  )

export const SprintUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    status: SprintStatusEnum.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate
      }
      return true
    },
    { message: 'Data de fim deve ser após a data de início', path: ['endDate'] },
  )

export type SprintCreateInput = z.infer<typeof SprintCreateSchema>
export type SprintUpdateInput = z.infer<typeof SprintUpdateSchema>
