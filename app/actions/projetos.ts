'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import {
  createProjeto,
  findAllByTenant,
  findById,
  updateProjeto,
  deleteProjeto,
  addMember,
  removeMember,
  getMembrosComDetalhes,
  updateUsuarioProjeto,
  getUserProjetosComDetalhes
} from '@/services/projetoService'
import { setProjectManagerRole } from '@/services/projectRoleService'

export async function createProjetoAction(
  _prevState: unknown,
  input: { nome: string; descricao?: string; initialMemberId?: string }
) {
  try {
    const { tenantId } = await verifySession()
    const projeto = await createProjeto({ nome: input.nome, descricao: input.descricao, tenantId })
    if (input.initialMemberId) {
      await addMember(projeto.id, input.initialMemberId)
      await setProjectManagerRole(input.initialMemberId, projeto.id, tenantId)
    }
    revalidatePath('/projetos')
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar projeto' }
  }
}

export async function getProjetosAction() {
  try {
    const { tenantId } = await verifySession()
    return await findAllByTenant(tenantId)
  } catch {
    return []
  }
}

export async function getProjetoAction(id: string) {
  try {
    await verifySession()
    const projeto = await findById(id)
    if (!projeto) {
      return { error: 'Projeto não encontrado' }
    }
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar projeto' }
  }
}

export async function updateProjetoAction(_prevState: unknown, id: string, data: Record<string, unknown>) {
  try {
    await verifySession()
    const projeto = await updateProjeto(id, data)
    revalidatePath('/projetos')
    revalidatePath(`/projetos/${id}`)
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar projeto' }
  }
}

export async function deleteProjetoAction(id: string) {
  try {
    await verifySession()
    await deleteProjeto(id)
    revalidatePath('/projetos')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar projeto' }
  }
}

export async function addMemberAction(projetoId: string, userId: string) {
  try {
    await verifySession()
    await addMember(projetoId, userId)
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar membro' }
  }
}

export async function removeMemberAction(projetoId: string, userId: string) {
  try {
    await verifySession()
    await removeMember(projetoId, userId)
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover membro' }
  }
}

export async function getMembrosAction(projetoId: string) {
  try {
    await verifySession()
    return await getMembrosComDetalhes(projetoId)
  } catch {
    return []
  }
}

export async function updateUsuarioProjetoAction(
  userId: string,
  projetoId: string,
  data: {
    projectRole?: string;
    cargos?: string[];
    departamentos?: string[];
    valorHora?: number | null;
    ativo?: boolean
  },
) {
  try {
    const { tenantId } = await verifySession()
    const membro = await updateUsuarioProjeto(userId, projetoId, { ...data, tenantId })
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    revalidatePath('/admin/users')
    return { membro }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar membro' }
  }
}

export async function getUserProjetosAction(userId: string) {
  try {
    await verifySession()
    const rows = await getUserProjetosComDetalhes(userId)
    return rows.map(r => ({
      ...r,
      dataEntrada: r.dataEntrada.toISOString(),
      dataSaida: r.dataSaida?.toISOString() ?? null,
    }))
  } catch {
    return []
  }
}