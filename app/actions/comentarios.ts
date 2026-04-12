'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import * as comentarioService from '@/services/comentarioService'
import prisma from '@/lib/prisma'

async function getSprintIdFromCard(cardId: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { sprintId: true } })
  return card?.sprintId ?? null
}

export async function createCommentAction(cardId: string, texto: string) {
  try {
    const { userId } = await verifySession()
    const comment = await comentarioService.create({ cardId, userId, content: texto })
    const sprintId = await getSprintIdFromCard(cardId)
    if (sprintId) revalidatePath(`/sprints/${sprintId}`)
    return { comment }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar comentário' }
  }
}

export async function getCommentsAction(cardId: string) {
  try {
    await verifySession()
    const comments = await comentarioService.findAllByCard(cardId)
    return { comments }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar comentários', comments: [] as never[] }
  }
}
