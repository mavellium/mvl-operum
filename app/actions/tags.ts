'use server'

import { verifySession } from '@/lib/dal'
import { tagsApi, cardsApi } from '@/lib/api-client'

export async function createTagAction(input: { name: string; color?: string }) {
  try {
    await verifySession()
    const tag = await tagsApi.create(input.name, input.color)
    return { tag }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar tag' }
  }
}

export async function deleteTagAction(tagId: string) {
  try {
    await verifySession()
    await tagsApi.delete(tagId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar tag' }
  }
}

export async function assignTagToCardAction(cardId: string, tagId: string) {
  try {
    await verifySession()
    await cardsApi.addTag(cardId, tagId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao associar tag' }
  }
}

export async function removeTagFromCardAction(cardId: string, tagId: string) {
  try {
    await verifySession()
    await cardsApi.removeTag(cardId, tagId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover tag' }
  }
}

export async function getTagsForUserAction() {
  try {
    await verifySession()
    const tags = await tagsApi.list()
    return { tags }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar tags' }
  }
}
