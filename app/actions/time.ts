'use server'

import { verifySession } from '@/lib/dal'
import {
  startTimer, pauseTimer, getActiveTimer, getTotalDuration, addManualTimeEntry,
  getTimeEntries, updateTimeEntry, deleteTimeEntry,
} from '@/services/timeService'

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

export async function addManualTimeAction(cardId: string, hours: number, minutes: number, description?: string) {
  try {
    const { userId } = await verifySession()
    const seconds = hours * 3600 + minutes * 60
    if (seconds <= 0) {
      return { error: 'O tempo deve ser maior que zero' }
    }
    const entry = await addManualTimeEntry(userId, cardId, seconds, description)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar tempo' }
  }
}

export async function getTimeEntriesAction(cardId: string) {
  try {
    const { userId } = await verifySession()
    const entries = await getTimeEntries(userId, cardId)
    return { entries }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar registros', entries: [] as never[] }
  }
}

export async function updateTimeEntryAction(entryId: string, hours: number, minutes: number, description?: string) {
  try {
    const { userId } = await verifySession()
    const seconds = hours * 3600 + minutes * 60
    if (seconds <= 0) {
      return { error: 'O tempo deve ser maior que zero' }
    }
    const entry = await updateTimeEntry(entryId, userId, { duration: seconds, description: description ?? null })
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar registro' }
  }
}

export async function deleteTimeEntryAction(entryId: string) {
  try {
    const { userId } = await verifySession()
    await deleteTimeEntry(entryId, userId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir registro' }
  }
}
