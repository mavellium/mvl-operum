'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { requireProjectPermission } from '@/services/projectAccess'
import { criarAta, atualizarAta, removerAta } from '@/services/ataService'
import { registrarAcao } from '@/services/auditoriaService'
import type { CriarAtaInput, AtualizarAtaInput } from '@/lib/validation/ataSchemas'

export async function criarAtaAction(input: CriarAtaInput) {
  try {
    const session = await verifySession()
    await requireProjectPermission(session, input.projetoId, 'documentos:editar')
    await requireProjectPermission(session, input.projetoId, 'documentos:aprovar')
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
    await requireProjectPermission(session, projetoId, 'documentos:editar')
    await requireProjectPermission(session, projetoId, 'documentos:aprovar')
    if (!(await prisma.ata.findFirst({ where: { id: ataId, projetoId, tenantId: session.tenantId }, select: { id: true } }))) throw new Error('Ata não encontrada neste projeto')
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
    await requireProjectPermission(session, projetoId, 'documentos:excluir')
    if (!(await prisma.ata.findFirst({ where: { id: ataId, projetoId, tenantId: session.tenantId }, select: { id: true } }))) throw new Error('Ata não encontrada neste projeto')
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
