'use server'

import { verifySession } from '@/lib/dal'
import { cardsApi } from '@/lib/api-client'

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
    await verifySession()
    const card = await cardsApi.get(cardId) as { responsibles?: { userId: string; user: { id: string; name: string; cargo: string | null; avatarUrl: string | null } }[] }
    return { responsibles: card.responsibles ?? [] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar responsáveis' }
  }
}
