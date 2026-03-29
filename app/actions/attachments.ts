'use server'

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { deleteUpload } from '@/services/fileUploadService'

export async function setCoverAction(cardId: string, attachmentId: string) {
  try {
    await verifySession()
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
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao definir capa' }
  }
}

export async function deleteAttachmentAction(attachmentId: string) {
  try {
    const { userId } = await verifySession()
    await deleteUpload(attachmentId, userId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir anexo' }
  }
}
