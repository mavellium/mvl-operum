'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'
import { criarAta, atualizarAta, removerAta } from '@/services/ataService'
import { registrarAcao } from '@/services/auditoriaService'
import type { CriarAtaInput, AtualizarAtaInput } from '@/lib/validation/ataSchemas'

async function isProjectMember(userId: string, projectId: string): Promise<boolean> {
  const entry = await prisma.userProject.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })
  return entry !== null && entry.active
}

async function authorizeMember(tenantId: string, role: string, userId: string, projectId: string) {
  if (role !== 'admin' && !(await isProjectMember(userId, projectId))) {
    throw new Error('Não autorizado: você não faz parte deste projeto')
  }
}

export async function criarAtaAction(input: CriarAtaInput) {
  try {
    const session = await verifySession()
    await authorizeMember(session.tenantId, session.role, session.userId, input.projetoId)
    const ata = await criarAta(session.tenantId, input)
    await registrarAcao({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'criar_ata',
      entity: 'Ata',
      entityId: ata.id,
      details: { projetoId: input.projetoId, numero: ata.numero },
    })
    revalidatePath(`/projetos/${input.projetoId}/atas`)
    return { success: true, id: ata.id, numero: ata.numero }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar ata' }
  }
}

export async function atualizarAtaAction(ataId: string, projetoId: string, input: AtualizarAtaInput) {
  try {
    const session = await verifySession()
    await authorizeMember(session.tenantId, session.role, session.userId, projetoId)
    const ata = await atualizarAta(session.tenantId, ataId, input)
    await registrarAcao({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'atualizar_ata',
      entity: 'Ata',
      entityId: ataId,
      details: { projetoId, numero: ata.numero },
    })
    revalidatePath(`/projetos/${projetoId}/atas`)
    revalidatePath(`/atas/${ataId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar ata' }
  }
}

export async function removerAtaAction(ataId: string, projetoId: string) {
  try {
    const session = await verifySession()
    const isAdmin = session.role === 'admin'
    const isManager = await isProjectManager(session.userId, projetoId)
    if (!isAdmin && !isManager) throw new Error('Não autorizado: só o gerente ou admin remove atas')
    await removerAta(session.tenantId, ataId)
    await registrarAcao({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'remover_ata',
      entity: 'Ata',
      entityId: ataId,
      details: { projetoId },
    })
    revalidatePath(`/projetos/${projetoId}/atas`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover ata' }
  }
}
