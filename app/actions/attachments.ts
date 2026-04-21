'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { filesApi } from '@/lib/api-client'

export async function setCoverAction(cardId: string, attachmentId: string) {
  try {
    await verifySession()
    await filesApi.setCover(cardId, attachmentId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao definir capa' }
  }
}

export async function deleteAttachmentAction(attachmentId: string) {
  try {
    await verifySession()
    await filesApi.delete(attachmentId)
    revalidatePath('/arquivos')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir anexo' }
  }
}
