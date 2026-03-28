'use server'

import { verifySession } from '@/lib/dal'
import { createTag, deleteTag, assignTagToCard, removeTagFromCard, getTagsForBoard } from '@/services/tagService'

export async function createTagAction(input: { name: string; color?: string; boardId: string }) {
  try {
    const { userId } = await verifySession()
    const tag = await createTag({ ...input, userId })
    return { tag }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar tag' }
  }
}

export async function deleteTagAction(tagId: string) {
  try {
    await verifySession()
    await deleteTag(tagId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar tag' }
  }
}

export async function assignTagToCardAction(cardId: string, tagId: string) {
  try {
    await verifySession()
    await assignTagToCard(cardId, tagId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao associar tag' }
  }
}

export async function removeTagFromCardAction(cardId: string, tagId: string) {
  try {
    await verifySession()
    await removeTagFromCard(cardId, tagId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover tag' }
  }
}

export async function getTagsForBoardAction(boardId: string) {
  try {
    await verifySession()
    const tags = await getTagsForBoard(boardId)
    return { tags }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar tags' }
  }
}
