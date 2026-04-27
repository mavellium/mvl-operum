'use server'

import { verifySession } from '@/lib/dal'
import { cardsApi, timeEntriesApi } from '@/lib/api-client'

export async function startTimerAction(cardId: string) {
  try {
    await verifySession()
    const entry = await cardsApi.startTimer(cardId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao iniciar timer' }
  }
}

export async function pauseTimerAction(cardId: string) {
  try {
    await verifySession()
    const entry = await cardsApi.stopTimer(cardId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao pausar timer' }
  }
}

export async function getCardTimeAction(cardId: string) {
  try {
    await verifySession()
    const { seconds } = await cardsApi.getTimeTotal(cardId)
    return { seconds }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar tempo' }
  }
}

export async function getActiveTimerAction(cardId: string) {
  try {
    await verifySession()
    const entry = await cardsApi.getActiveTimer(cardId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar timer', entry: null }
  }
}

export async function addManualTimeAction(cardId: string, hours: number, minutes: number, description?: string) {
  try {
    await verifySession()
    const seconds = hours * 3600 + minutes * 60
    if (seconds <= 0) {
      return { error: 'O tempo deve ser maior que zero' }
    }
    const entry = await cardsApi.createManualEntry(cardId, { seconds, description })
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar tempo' }
  }
}

export async function getTimeEntriesAction(cardId: string) {
  try {
    await verifySession()
    const entries = await cardsApi.listTimeEntries(cardId)
    return { entries }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar registros', entries: [] as never[] }
  }
}

export async function updateTimeEntryAction(entryId: string, hours: number, minutes: number, description?: string) {
  try {
    await verifySession()
    const seconds = hours * 3600 + minutes * 60
    if (seconds <= 0) {
      return { error: 'O tempo deve ser maior que zero' }
    }
    const entry = await timeEntriesApi.update(entryId, { duration: seconds, description: description ?? null })
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar registro' }
  }
}

export async function deleteTimeEntryAction(entryId: string) {
  try {
    await verifySession()
    await timeEntriesApi.delete(entryId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir registro' }
  }
}
