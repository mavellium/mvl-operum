'use server'

import { verifySession } from '@/lib/dal'
import { startTimer, pauseTimer, getActiveTimer, getTotalDuration } from '@/services/timeService'

export async function startTimerAction(cardId: string) {
  try {
    const { userId } = await verifySession()
    const entry = await startTimer(userId, cardId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao iniciar timer' }
  }
}

export async function pauseTimerAction(cardId: string) {
  try {
    const { userId } = await verifySession()
    const entry = await pauseTimer(userId, cardId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao pausar timer' }
  }
}

export async function getCardTimeAction(cardId: string) {
  try {
    const { userId } = await verifySession()
    const seconds = await getTotalDuration(userId, cardId)
    return { seconds }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar tempo' }
  }
}

export async function getActiveTimerAction(cardId: string) {
  try {
    const { userId } = await verifySession()
    const entry = await getActiveTimer(userId, cardId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar timer', entry: null }
  }
}
