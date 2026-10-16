import { Logger } from '@nestjs/common'
import { LIMITE_HORAS } from './regras-tempo'

const logger = new Logger('AvisoTimer')

/**
 * Avisa o dono de um timer encerrado no limite (notification-service, chave interna,
 * como o file-service faz com o sprint-service). Best-effort: a correção do tempo
 * vale mesmo se o aviso falhar.
 */
export async function avisarTimerEncerrado(userId: string, card: { id: string; title: string; sprintId: string | null }): Promise<void> {
  const base = process.env.NOTIFICATION_SERVICE_URL
  const key = process.env.INTERNAL_API_KEY
  if (!base || !key) return
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': key },
      body: JSON.stringify({
        userId,
        type: 'UPDATE',
        title: 'Timer encerrado no limite',
        message: `Seu timer em "${card.title}" passou de ${LIMITE_HORAS} h e foi encerrado no limite. Confira o lançamento e corrija a duração se você esqueceu o timer rodando.`,
        reference: card.sprintId ? `/sprints/${card.sprintId}?card=${encodeURIComponent(card.id)}` : undefined,
        referenceType: 'CARD',
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) logger.warn(`notification-service respondeu ${res.status}`)
  } catch (err) {
    logger.warn(`falha ao avisar timer encerrado: ${err instanceof Error ? err.message : err}`)
  }
}
