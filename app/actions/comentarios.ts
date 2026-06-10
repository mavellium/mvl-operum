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

export async function updateCommentAction(cardId: string, commentId: string, content: string) {
  try {
    await verifySession()
    // Authorization: sprint-service enforces ownership — throws ForbiddenException (403)
    // if x-user-id (injected by API gateway from session) !== comment.userId.
    // The catch below surfaces that as { error: 'Sem permissão para editar' }.
    // The UI additionally renders the edit button only for the current user's comments.
    await cardsApi.updateComment(cardId, commentId, content)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao editar comentário' }
  }
}

export async function deleteCommentAction(cardId: string, commentId: string) {
  try {
    await verifySession()
    // Authorization: same contract as updateCommentAction — server enforces ownership via
    // ForbiddenException; UI hides the delete button for comments not owned by currentUser.
    await cardsApi.deleteComment(cardId, commentId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir comentário' }
  }
}
