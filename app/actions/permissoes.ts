'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { isPermissao, type Permissao } from '@/lib/permissoes'
import { registrarAcao } from '@/services/auditoriaService'
import { permissoesNoProjeto } from '@/services/authz'
import {
  listarAjustesDoUsuario,
  listarFuncoesComPermissoes,
  restaurarPadraoDaFuncao,
  salvarAjusteDoUsuario,
  salvarPermissoesDaFuncao,
  type AjustesDoUsuario,
  type FuncaoComPermissoes,
} from '@/services/permissoesService'

/**
 * Permissões (SDD 5.1). Só o admin altera funções e ajustes por usuário, como
 * definido pelo usuário em 30/09. Qualquer um consulta as próprias permissões
 * num projeto (para a interface esconder o que não pode fazer).
 */

const ID = z.string().regex(/^[a-z0-9]{20,32}$/i, 'id inválido')
const PERMISSAO = z.string().refine(isPermissao, 'permissão desconhecida')

async function exigirAdmin() {
  const sessao = await verifySession()
  if (sessao.role !== 'admin') throw new Error('Apenas o administrador pode alterar permissões.')
  return sessao
}

function erro(err: unknown, padrao: string) {
  return { error: err instanceof Error ? err.message : padrao }
}

export async function listarPermissoesFuncoesAction(): Promise<{ funcoes: FuncaoComPermissoes[] } | { error: string }> {
  try {
    const { tenantId } = await exigirAdmin()
    return { funcoes: await listarFuncoesComPermissoes(tenantId) }
  } catch (err) {
    return erro(err, 'Erro ao carregar as permissões.')
  }
}

const SalvarFuncaoSchema = z.object({
  roleId: ID.nullable(),
  permissoes: z.array(PERMISSAO).max(100),
}).strict()

export async function salvarPermissoesFuncaoAction(input: { roleId: string | null; permissoes: string[] }) {
  try {
    const { tenantId, userId } = await exigirAdmin()
    const dados = SalvarFuncaoSchema.parse(input)
    const permissoes = [...new Set(dados.permissoes)] as Permissao[]
    const role = await salvarPermissoesDaFuncao(tenantId, dados.roleId, permissoes)
    await registrarAcao({
      tenantId, userId, action: 'PERMISSOES_FUNCAO', entity: 'role', entityId: role.id,
      details: { funcao: role.name, permissoes },
    })
    revalidatePath('/admin/cadastros')
    return { success: true as const, roleId: role.id, funcoes: await listarFuncoesComPermissoes(tenantId) }
  } catch (err) {
    return erro(err, 'Erro ao salvar as permissões da função.')
  }
}

export async function restaurarPadraoFuncaoAction(roleId: string) {
  try {
    const { tenantId, userId } = await exigirAdmin()
    const role = await restaurarPadraoDaFuncao(tenantId, ID.parse(roleId))
    await registrarAcao({
      tenantId, userId, action: 'PERMISSOES_FUNCAO_PADRAO', entity: 'role', entityId: role.id,
      details: { funcao: role.name },
    })
    revalidatePath('/admin/cadastros')
    return { success: true as const, funcoes: await listarFuncoesComPermissoes(tenantId) }
  } catch (err) {
    return erro(err, 'Erro ao restaurar o padrão da função.')
  }
}

export async function listarAjustesUsuarioAction(
  userId: string,
  projectId: string | null,
): Promise<AjustesDoUsuario | { error: string }> {
  try {
    const { tenantId } = await exigirAdmin()
    return await listarAjustesDoUsuario(tenantId, ID.parse(userId), projectId === null ? null : ID.parse(projectId))
  } catch (err) {
    return erro(err, 'Erro ao carregar as permissões do usuário.')
  }
}

const SalvarAjusteSchema = z.object({
  userId: ID,
  projectId: ID.nullable(),
  permissao: PERMISSAO,
  efeito: z.enum(['GRANT', 'DENY']).nullable(),
}).strict()

export async function salvarAjusteUsuarioAction(input: {
  userId: string
  projectId: string | null
  permissao: string
  efeito: 'GRANT' | 'DENY' | null
}) {
  try {
    const { tenantId, userId: adminId } = await exigirAdmin()
    const d = SalvarAjusteSchema.parse(input)
    await salvarAjusteDoUsuario(tenantId, d.userId, d.projectId, d.permissao as Permissao, d.efeito)
    await registrarAcao({
      tenantId, userId: adminId, action: 'PERMISSAO_USUARIO', entity: 'user', entityId: d.userId,
      details: { projeto: d.projectId, permissao: d.permissao, efeito: d.efeito ?? 'HERDAR' },
    })
    if (d.projectId) revalidatePath(`/projetos/${d.projectId}`, 'layout')
    return { success: true as const }
  } catch (err) {
    return erro(err, 'Erro ao salvar a permissão do usuário.')
  }
}

/** Permissões do usuário logado no projeto, para a interface. */
export async function minhasPermissoesAction(projectId: string): Promise<Permissao[]> {
  const { userId, tenantId, role } = await verifySession()
  if (!ID.safeParse(projectId).success) return []
  return [...(await permissoesNoProjeto(userId, tenantId, role, projectId))]
}
