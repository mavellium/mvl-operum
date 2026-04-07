import { z } from 'zod'

const NotificacaoTipoEnum = z.enum(['COMENTARIO', 'ATRIBUICAO', 'ATUALIZACAO', 'CONCLUSAO', 'MENCIONADO', 'CONVITE'])
const NotificacaoStatusEnum = z.enum(['NAO_LIDA', 'LIDA', 'ARQUIVADA'])

export const CreateNotificacaoSchema = z.object({
  userId: z.string().min(1, 'UserId é obrigatório'),
  tipo: NotificacaoTipoEnum,
  titulo: z.string().trim().min(1, 'Título é obrigatório'),
  mensagem: z.string().trim().min(1, 'Mensagem é obrigatória'),
  referencia: z.string().optional(),
  referenciaTipo: z.string().optional(),
})

export const UpdateNotificacaoSchema = z.object({
  status: NotificacaoStatusEnum.optional(),
})

export type CreateNotificacaoInput = z.infer<typeof CreateNotificacaoSchema>
export type UpdateNotificacaoInput = z.infer<typeof UpdateNotificacaoSchema>
