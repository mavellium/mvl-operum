'use server'

import { verifySession } from '@/lib/dal'
import { addResponsible, removeResponsible, getResponsibles } from '@/services/cardResponsibleService'
import prisma from '@/lib/prisma'

export async function addResponsibleAction(cardId: string, userId: string) {
  try {
    await verifySession()
    const entry = await addResponsible(cardId, userId)
    // Keep backward-compat field in sync with first responsible
    const existing = await getResponsibles(cardId)
    if (existing.length === 1) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
      if (user) {
        await prisma.card.update({ where: { id: cardId }, data: { responsible: user.name, responsibleId: userId } })
      }
    }
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar responsável' }
  }
}

export async function removeResponsibleAction(cardId: string, userId: string) {
  try {
    await verifySession()
    await removeResponsible(cardId, userId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover responsável' }
  }
}

export async function getResponsiblesAction(cardId: string) {
  try {
    await verifySession()
    const responsibles = await getResponsibles(cardId)
    return { responsibles }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar responsáveis' }
  }
}
