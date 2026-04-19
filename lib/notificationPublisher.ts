import type { CreateNotificacaoInput } from '@/lib/validation/notificacaoSchemas'

// When NOTIFICATION_SERVICE_URL is set, publishes to BullMQ queue (async).
// Otherwise falls back to direct DB write via notificacaoService.
export async function publishNotification(input: CreateNotificacaoInput): Promise<void> {
  const serviceUrl = process.env.NOTIFICATION_SERVICE_URL

  if (serviceUrl) {
    const { Queue } = await import('bullmq')
    const queue = new Queue('notifications', {
      connection: {
        host: process.env.REDIS_HOST ?? 'redis',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      },
    })
    await queue.add('create', input)
    await queue.close()
    return
  }

  const { create } = await import('@/services/notificacaoService')
  await create(input)
}
