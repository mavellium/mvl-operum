'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { deleteUpload } from '@/services/fileUploadService'

async function getSprintIdFromCard(cardId: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { sprintId: true } })
  return card?.sprintId ?? null
}

async function getSprintIdFromAttachment(attachmentId: string) {
  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: { card: { select: { sprintId: true } } },
  })
  return att?.card.sprintId ?? null
}

export async function setCoverAction(cardId: string, attachmentId: string) {
  try {
    const { tenantId } = await verifySession()
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { sprint: { select: { project: { select: { tenantId: true } } } } },
    })
    if (!card || card.sprint?.project?.tenantId !== tenantId) {
      return { error: 'Acesso negado' }
    }
    await prisma.$transaction(async tx => {
      await tx.attachment.updateMany({
        where: { cardId },
        data: { isCover: false },
      })
      await tx.attachment.update({
        where: { id: attachmentId },
        data: { isCover: true },
      })
    })
    const sprintId = await getSprintIdFromCard(cardId)
    if (sprintId) revalidatePath(`/sprints/${sprintId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao definir capa' }
  }
}

export async function deleteAttachmentAction(attachmentId: string) {
  try {
    const { userId } = await verifySession()
    const sprintId = await getSprintIdFromAttachment(attachmentId)
    await deleteUpload(attachmentId, userId)
    if (sprintId) revalidatePath(`/sprints/${sprintId}`)
    revalidatePath('/arquivos')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir anexo' }
  }
}
