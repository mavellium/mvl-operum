import { z } from 'zod'

const dateString = z
  .string()
  .trim()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida' })
  .transform((val) => new Date(val))

export const CsvRowSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  description: z.string().trim().optional(),
  responsible: z.string().trim().optional(),
  status: z.string().trim().optional(),
  sprint: z.string().trim().optional(),
  tags: z.string().trim().optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  color: z.string().trim().optional(),
})

export type CsvRowInput = z.infer<typeof CsvRowSchema>
