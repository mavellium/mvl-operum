'use server'

import { verifySession } from '@/lib/dal'
import { cardsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'
import { publishNotification } from '@/lib/notificationPublisher'
import { findById } from '@/services/projectService'

export async function addResponsibleAction(cardId: string, userId: string) {
  try {
    await verifySession()
    const entry = await cardsApi.addResponsible(cardId, userId)
    await notifyAssignedResponsible(cardId, userId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar responsável' }
  }
}

/**
 * Publica uma notificação ASSIGNMENT para o usuário que acabou de ser
 * designado como responsável pela tarefa. É best-effort: falha na
 * notificação não deve impedir a atribuição em si.
 *
 * `reference` guarda um link navegável para o card (rota com contexto de
 * projeto + query `?card=`), pois a UI usa esse campo como href do botão "Ver".
 */
async function notifyAssignedResponsible(cardId: string, userId: string) {
  try {
    const card = await cardsApi.get(cardId) as { title?: string; sprintId?: string | null; projectId?: string | null }

    let reference: string | undefined
    if (card.sprintId) {
      const base = card.projectId
        ? `/projetos/${card.projectId}/sprints/${card.sprintId}`
        : `/sprints/${card.sprintId}`
      reference = `${base}?card=${cardId}`
    }

    // Nome do projeto para a mensagem — isolado em try/catch próprio: se a
    // consulta falhar, a notificação é publicada mesmo assim (sem o nome).
    let projectSuffix = ''
    if (card.projectId) {
      try {
        const projeto = await findById(card.projectId)
        if (projeto?.name) projectSuffix = ` no projeto ${projeto.name}`
      } catch { /* best-effort: notifica sem o nome do projeto */ }
    }

    await publishNotification({
      userId,
      type: 'ASSIGNMENT',
      title: 'Nova tarefa atribuída',
      message: `Você foi designado responsável pela tarefa "${card.title ?? 'sem título'}"${projectSuffix}`,
      reference,
      referenceType: 'CARD',
    })
  } catch {
    // best-effort: silencioso
  }
}

export async function removeResponsibleAction(cardId: string, userId: string) {
  try {
    await verifySession()
    await cardsApi.removeResponsible(cardId, userId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover responsável' }
  }
}

export async function getResponsiblesAction(cardId: string) {
  try {
    const session = await verifySession()
    const card = await cardsApi.get(cardId) as { responsibles?: { userId: string; user: { id: string; name: string; cargo: string | null; avatarUrl: string | null } }[] }
    const responsibles = card.responsibles ?? []

    // O sprint-service replica o User sem avatarUrl; enriquecer cruzando com o
    // banco principal para o avatar não sumir ao reabrir o card.
    const userIds = responsibles.map(r => r.userId).filter(Boolean)
    const avatarByUserId = new Map<string, string | null>()
    if (userIds.length > 0) {
      const found = await prisma.userProject.findMany({
        where: { userId: { in: userIds }, user: { tenantId: session.tenantId } },
        select: { userId: true, user: { select: { avatarUrl: true } } },
      })
      for (const f of found) avatarByUserId.set(f.userId, f.user.avatarUrl ?? null)
    }

    const enriched = responsibles.map(r => ({
      ...r,
      user: { ...r.user, avatarUrl: r.user.avatarUrl ?? avatarByUserId.get(r.userId) ?? null },
    }))
    return { responsibles: enriched }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar responsáveis' }
  }
}
