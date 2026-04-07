'use server'

import { verifySession } from '@/lib/dal'
import { findAllByUser, markAsRead, markAsArchived } from '@/services/notificacaoService'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getNotificacoesAction(filters?: { status?: string; tipo?: string }) {
  try {
    const { userId } = await verifySession()
    const notificacoes = await findAllByUser(userId, { limit: 100 })
    if (filters?.tipo) {
      return notificacoes.filter(n => n.tipo === filters.tipo)
    }
    if (filters?.status) {
      return notificacoes.filter(n => n.status === filters.status)
    }
    return notificacoes
  } catch {
    return []
  }
}

export async function markNotificacaoAsReadAction(id: string) {
  try {
    const { userId } = await verifySession()
    const notificacao = await prisma.notificacao.findUnique({ where: { id, deletedAt: null } })
    if (!notificacao || notificacao.userId !== userId) {
      return { error: 'Notificação não encontrada' }
    }
    await markAsRead(id)
    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao marcar como lida' }
  }
}

export async function markAllAsReadAction() {
  try {
    const { userId } = await verifySession()
    await prisma.notificacao.updateMany({
      where: { userId, status: 'NAO_LIDA', deletedAt: null },
      data: { status: 'LIDA', lido_em: new Date() },
    })
    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao marcar todas como lidas' }
  }
}

export async function archiveNotificacaoAction(id: string) {
  try {
    const { userId } = await verifySession()
    const notificacao = await prisma.notificacao.findUnique({ where: { id, deletedAt: null } })
    if (!notificacao || notificacao.userId !== userId) {
      return { error: 'Notificação não encontrada' }
    }
    await markAsArchived(id)
    revalidatePath('/notificacoes')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao arquivar notificação' }
  }
}
