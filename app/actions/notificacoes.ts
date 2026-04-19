'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

function serviceUrl() {
  return process.env.NOTIFICATION_SERVICE_URL
}

function internalHeaders(): Record<string, string> {
  return { 'x-internal-api-key': process.env.INTERNAL_API_KEY ?? '' }
}

async function serviceGet(path: string) {
  const res = await fetch(`${serviceUrl()}${path}`, { cache: 'no-store', headers: internalHeaders() })
  if (!res.ok) throw new Error(`notification-service error: ${res.status}`)
  return res.json()
}

async function servicePatch(path: string) {
  const res = await fetch(`${serviceUrl()}${path}`, { method: 'PATCH', headers: internalHeaders() })
  if (!res.ok) throw new Error(`notification-service error: ${res.status}`)
  return res.json()
}

async function serviceDelete(path: string) {
  const res = await fetch(`${serviceUrl()}${path}`, { method: 'DELETE', headers: internalHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(`notification-service error: ${res.status}`)
}

export async function getNotificacoesAction(filters?: { status?: string; type?: string }) {
  try {
    const { userId } = await verifySession()

    if (serviceUrl()) {
      const params = new URLSearchParams({ userId, limit: '100' })
      const notifications = await serviceGet(`/notifications?${params}`)
      if (filters?.type) return notifications.filter((n: any) => n.type === filters.type)
      if (filters?.status) return notifications.filter((n: any) => n.status === filters.status)
      return notifications
    }

    const { findAllByUser } = await import('@/services/notificacaoService')
    const notifications = await findAllByUser(userId, { limit: 100 })
    if (filters?.type) return notifications.filter(n => n.type === filters.type)
    if (filters?.status) return notifications.filter(n => n.status === filters.status)
    return notifications
  } catch {
    return []
  }
}

export async function markNotificacaoAsReadAction(id: string) {
  try {
    const { userId } = await verifySession()

    if (serviceUrl()) {
      const notification = await serviceGet(`/notifications/${id}`)
      if (notification.userId !== userId) return { error: 'Notification not found' }
      await servicePatch(`/notifications/${id}/read`)
    } else {
      const prisma = (await import('@/lib/prisma')).default
      const notification = await prisma.notification.findUnique({ where: { id, deletedAt: null } })
      if (!notification || notification.userId !== userId) return { error: 'Notification not found' }
      const { markAsRead } = await import('@/services/notificacaoService')
      await markAsRead(id)
    }

    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error marking as read' }
  }
}

export async function markAllAsReadAction() {
  try {
    const { userId } = await verifySession()

    if (serviceUrl()) {
      const notifications = await serviceGet(`/notifications?userId=${userId}&status=UNREAD&limit=500`)
      await Promise.all(notifications.map((n: any) => servicePatch(`/notifications/${n.id}/read`)))
    } else {
      const prisma = (await import('@/lib/prisma')).default
      await prisma.notification.updateMany({
        where: { userId, status: 'UNREAD', deletedAt: null },
        data: { status: 'READ', readAt: new Date() },
      })
    }

    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error marking all as read' }
  }
}

export async function archiveNotificacaoAction(id: string) {
  try {
    const { userId } = await verifySession()

    if (serviceUrl()) {
      const notification = await serviceGet(`/notifications/${id}`)
      if (notification.userId !== userId) return { error: 'Notification not found' }
      await servicePatch(`/notifications/${id}/archive`)
    } else {
      const prisma = (await import('@/lib/prisma')).default
      const notification = await prisma.notification.findUnique({ where: { id, deletedAt: null } })
      if (!notification || notification.userId !== userId) return { error: 'Notification not found' }
      const { markAsArchived } = await import('@/services/notificacaoService')
      await markAsArchived(id)
    }

    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error archiving notification' }
  }
}
