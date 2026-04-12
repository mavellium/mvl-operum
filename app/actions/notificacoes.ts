'use server'

import { verifySession } from '@/lib/dal'
import { findAllByUser, markAsRead, markAsArchived } from '@/services/notificacaoService'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getNotificacoesAction(filters?: { status?: string; type?: string }) {
  try {
    const { userId } = await verifySession()
    const notifications = await findAllByUser(userId, { limit: 100 })
    if (filters?.type) {
      return notifications.filter(n => n.type === filters.type)
    }
    if (filters?.status) {
      return notifications.filter(n => n.status === filters.status)
    }
    return notifications
  } catch {
    return []
  }
}

export async function markNotificacaoAsReadAction(id: string) {
  try {
    const { userId } = await verifySession()
    const notification = await prisma.notification.findUnique({ where: { id, deletedAt: null } })
    if (!notification || notification.userId !== userId) {
      return { error: 'Notification not found' }
    }
    await markAsRead(id)
    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error marking as read' }
  }
}

export async function markAllAsReadAction() {
  try {
    const { userId } = await verifySession()
    await prisma.notification.updateMany({
      where: { userId, status: 'UNREAD', deletedAt: null },
      data: { status: 'READ', readAt: new Date() },
    })
    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error marking all as read' }
  }
}

export async function archiveNotificacaoAction(id: string) {
  try {
    const { userId } = await verifySession()
    const notification = await prisma.notification.findUnique({ where: { id, deletedAt: null } })
    if (!notification || notification.userId !== userId) {
      return { error: 'Notification not found' }
    }
    await markAsArchived(id)
    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error archiving notification' }
  }
}
