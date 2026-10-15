import 'server-only'
import { cardsApi } from '@/lib/api-client'
import { publishNotification } from '@/lib/notificationPublisher'
import { findById } from '@/services/projectService'
import { sprintPath } from '@/lib/sprintPath'

/**
 * Publica uma notificação ASSIGNMENT para o usuário que acabou de ser
 * designado como responsável pela tarefa. É best-effort: falha na
 * notificação não deve impedir a atribuição em si.
 *
 * `reference` guarda um link navegável para o card (rota com contexto de
 * projeto + query `?card=`), pois a UI usa esse campo como href do botão "Ver".
 */
export async function notifyAssignedResponsible(cardId: string, userId: string) {
  try {
    const card = await cardsApi.get(cardId) as { title?: string; sprintId?: string | null; projectId?: string | null }

    let reference: string | undefined
    if (card.sprintId) {
      reference = sprintPath(card.sprintId, card.projectId, cardId)
    }

    // Nome do projeto para a mensagem — isolado em try/catch próprio: se a
    // consulta falhar, a notificação é publicada mesmo assim (sem o nome).
    let projectSuffix = ''
    if (card.projectId) {
      try {
        const projeto = await findById(card.projectId)
        if (projeto?.name) projectSuffix = ` no projeto ${projeto.name}`
      } catch { /* best-effort: notifica sem o nome do projeto */ }
    }

    await publishNotification({
      userId,
      type: 'ASSIGNMENT',
      title: 'Nova tarefa atribuída',
      message: `Você foi designado responsável pela tarefa "${card.title ?? 'sem título'}"${projectSuffix}`,
      reference,
      referenceType: 'CARD',
    })
  } catch {
    // best-effort: silencioso
  }
}
