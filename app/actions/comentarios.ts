'use server'

import { verifySession } from '@/lib/dal'
import { cardsApi } from '@/lib/api-client'

export async function createCommentAction(cardId: string, texto: string) {
  try {
    await verifySession()
    const comment = await cardsApi.createComment(cardId, texto)
    return { comment }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar comentário' }
  }
}

export async function getCommentsAction(cardId: string) {
  try {
    await verifySession()
    const comments = await cardsApi.listComments(cardId)
    return { comments }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar comentários', comments: [] as never[] }
  }
}
