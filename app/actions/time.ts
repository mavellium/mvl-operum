'use server'

import { verifySession } from '@/lib/dal'
import { cardsApi, timeEntriesApi } from '@/lib/api-client'

// CUIDs gerados pelo Prisma: começam com 'c', alfanuméricos minúsculos, ~25 chars
const CUID_RE = /^c[a-z0-9]{20,30}$/
const MAX_DESCRIPTION_LENGTH = 500

function assertValidId(id: string, label = 'ID'): void {
  if (!id || !CUID_RE.test(id)) {
    throw new Error(`${label} inválido`)
  }
}

function assertValidTime(hours: number, minutes: number): void {
  if (!Number.isInteger(hours) || hours < 0 || hours > 168) {
    throw new Error('Horas deve ser um número inteiro entre 0 e 168')
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    throw new Error('Minutos deve ser um número inteiro entre 0 e 59')
  }
}

function sanitizeDescription(desc?: string): string | undefined {
  if (desc === undefined) return undefined
  const trimmed = desc.trim()
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Descrição excede o limite de ${MAX_DESCRIPTION_LENGTH} caracteres`)
  }
  return trimmed || undefined
}

export async function startTimerAction(cardId: string) {
  try {
    await verifySession()
    assertValidId(cardId, 'cardId')
    const entry = await cardsApi.startTimer(cardId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao iniciar timer' }
  }
}

export async function pauseTimerAction(entryId: string) {
  try {
    await verifySession()
    assertValidId(entryId, 'entryId')
    const entry = await cardsApi.stopTimer(entryId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao pausar timer' }
  }
}

export async function getCardTimeAction(cardId: string) {
  try {
    await verifySession()
    assertValidId(cardId, 'cardId')
    const { seconds } = await cardsApi.getTimeTotal(cardId)
    return { seconds }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar tempo' }
  }
}

export async function getActiveTimerAction(cardId: string) {
  try {
    await verifySession()
    assertValidId(cardId, 'cardId')
    const entry = await cardsApi.getActiveTimer(cardId)
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar timer', entry: null }
  }
}

export async function addManualTimeAction(cardId: string, hours: number, minutes: number, secs = 0, description?: string) {
  try {
    await verifySession()
    assertValidId(cardId, 'cardId')
    assertValidTime(hours, minutes)
    if (!Number.isInteger(secs) || secs < 0 || secs > 59) {
      throw new Error('Segundos deve ser um número inteiro entre 0 e 59')
    }
    const safeDescription = sanitizeDescription(description)
    const seconds = hours * 3600 + minutes * 60 + secs
    if (seconds <= 0) {
      return { error: 'O tempo deve ser maior que zero' }
    }
    const endedAt = new Date()
    const startedAt = new Date(endedAt.getTime() - seconds * 1000)
    const entry = await cardsApi.createManualEntry(cardId, {
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      description: safeDescription,
    })
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar tempo' }
  }
}

export async function getTimeEntriesAction(cardId: string) {
  try {
    await verifySession()
    assertValidId(cardId, 'cardId')
    const entries = await cardsApi.listTimeEntries(cardId)
    return { entries }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar registros', entries: [] as never[] }
  }
}

export async function updateTimeEntryAction(entryId: string, hours: number, minutes: number, description?: string) {
  try {
    await verifySession()
    assertValidId(entryId, 'entryId')
    assertValidTime(hours, minutes)
    const safeDescription = sanitizeDescription(description)
    const seconds = hours * 3600 + minutes * 60
    if (seconds <= 0) {
      return { error: 'O tempo deve ser maior que zero' }
    }
    const entry = await timeEntriesApi.update(entryId, { duration: seconds, description: safeDescription ?? null })
    return { entry }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar registro' }
  }
}

export async function deleteTimeEntryAction(entryId: string) {
  try {
    await verifySession()
    assertValidId(entryId, 'entryId')
    await timeEntriesApi.delete(entryId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir registro' }
  }
}
