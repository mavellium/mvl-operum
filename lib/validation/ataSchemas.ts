import { z } from 'zod'

export const AtaPresenteSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(200),
  setorEmpresa: z.string().trim().max(200).optional().nullable(),
})

export const AtaAcaoSchema = z.object({
  acao: z.string().trim().min(1, 'Ação obrigatória').max(1000),
  prazo: z.string().datetime().optional().nullable(),
  responsavel: z.string().trim().max(200).optional().nullable(),
})

export const AtaAnexoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(255),
  url: z.string().trim().max(2000).optional().nullable(),
})

export const CriarAtaSchema = z.object({
  projetoId: z.string().min(1),
  local: z.string().trim().max(200).optional().nullable(),
  data: z.string().datetime(),
  elaboradoPor: z.string().trim().min(1, 'Elaborado por obrigatório').max(200),
  aprovadoPor: z.string().trim().max(200).optional().nullable(),
  assuntosTratados: z.string().max(10000).optional().nullable(),
  decisoesTomadas: z.string().max(10000).optional().nullable(),
  observacoes: z.string().max(10000).optional().nullable(),
  copiasPara: z.array(z.string().email('E-mail inválido')).optional().default([]),
  presentes: z.array(AtaPresenteSchema).optional().default([]),
  acoes: z.array(AtaAcaoSchema).optional().default([]),
  anexos: z.array(AtaAnexoSchema).optional().default([]),
})

export const AtualizarAtaSchema = CriarAtaSchema.omit({ projetoId: true })

export type CriarAtaInput = z.infer<typeof CriarAtaSchema>
export type AtualizarAtaInput = z.infer<typeof AtualizarAtaSchema>
