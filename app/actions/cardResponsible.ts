'use server'

import { verifySession } from '@/lib/dal'
import { cardsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'

export async function addResponsibleAction(cardId: string, userId: string) {
  try {
    await verifySession()
    const entry = await cardsApi.addResponsible(cardId, userId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar responsável' }
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
