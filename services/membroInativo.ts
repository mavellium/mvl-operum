import 'server-only'
import prisma from '@/lib/prisma'
import { isColunaConcluida } from '@/lib/cardUtils'
import { precisaDeOutroResponsavel, MENSAGEM_RESPONSAVEL_INATIVO } from '@/lib/responsavelInativo'
import { sprintPath } from '@/lib/sprintPath'
import { publishNotification } from '@/lib/notificationPublisher'

/** Membros inativados no projeto (com motivo). Desvinculados sem motivo não entram. */
export async function idsMembrosInativos(projectId: string): Promise<Set<string>> {
  const rows = await prisma.userProject.findMany({
    where: { projectId, active: false, inactiveReason: { not: null } },
    select: { userId: true },
  })
  return new Set(rows.map(r => r.userId))
}

export interface CardPendente { id: string; title: string; sprintId: string | null }

/**
 * Cards abertos do projeto (backlog ou sprint, fora da coluna de conclusão) em que
 * todos os responsáveis estão inativos: são as pendências que o gerente precisa
 * resolver adicionando outro responsável.
 */
export async function cardsSemResponsavelAtivo(projectId: string, inativos: Set<string>): Promise<CardPendente[]> {
  if (inativos.size === 0) return []
  const cards = await prisma.card.findMany({
    where: {
      deletedAt: null,
      OR: [{ projectId }, { sprint: { projectId } }],
      responsibles: { some: { userId: { in: [...inativos] } } },
    },
    select: {
      id: true, title: true, sprintId: true,
      sprintColumn: { select: { title: true } },
      responsibles: { select: { userId: true } },
    },
  })
  return cards
    .filter(c => !isColunaConcluida(c.sprintColumn?.title))
    .filter(c => precisaDeOutroResponsavel(c.responsibles.map(r => r.userId), inativos))
    .map(c => ({ id: c.id, title: c.title, sprintId: c.sprintId }))
}

/** Gerentes do projeto (papel `gerente`), sem o próprio inativado. */
async function gerentesDoProjeto(projectId: string, exceto: string): Promise<string[]> {
  const rows = await prisma.userProjectRole.findMany({
    where: { projectId, deletedAt: null, role: { nameKey: 'gerente' }, userId: { not: exceto } },
    select: { userId: true },
  })
  return [...new Set(rows.map(r => r.userId))]
}

/**
 * Avisa cada gerente do projeto que o membro foi inativado e lista os cards que
 * ficaram sem responsável ativo. Best-effort: falha ao notificar não desfaz a inativação.
 */
export async function notificarPendenciasDoMembroInativo(
  projectId: string,
  membro: { id: string; name: string },
  motivo: string,
): Promise<{ gerentes: number; pendentes: number }> {
  const [projeto, inativos, gerentes] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    idsMembrosInativos(projectId),
    gerentesDoProjeto(projectId, membro.id),
  ])
  const pendentes = await cardsSemResponsavelAtivo(projectId, inativos)
  const doMembro = pendentes.length === 0 ? [] : await prisma.cardResponsible.findMany({
    where: { userId: membro.id, cardId: { in: pendentes.map(p => p.id) } },
    select: { cardId: true },
  })
  const ids = new Set(doMembro.map(r => r.cardId))
  const cards = pendentes.filter(p => ids.has(p.id))

  const lista = cards.slice(0, 10).map(c => `"${c.title}"`).join(', ')
  const resto = cards.length > 10 ? ` e mais ${cards.length - 10}` : ''
  const message = cards.length === 0
    ? `${membro.name} foi inativado no projeto ${projeto?.name ?? ''}. Motivo: ${motivo}. Nenhum card ficou sem responsável ativo.`
    : `${membro.name} foi inativado no projeto ${projeto?.name ?? ''}. Motivo: ${motivo}. ${cards.length} card(s) ficaram sem responsável ativo e precisam de outro responsável para serem concluídos: ${lista}${resto}.`
  const primeiro = cards.find(c => c.sprintId)
  const reference = primeiro?.sprintId
    ? sprintPath(primeiro.sprintId, projectId, cards.length === 1 ? primeiro.id : null)
    : `/projetos/${projectId}/stakeholders`

  await Promise.all(gerentes.map(userId =>
    publishNotification({
      userId,
      type: 'UPDATE',
      title: cards.length === 0 ? 'Membro inativado' : 'Pendência: cards sem responsável ativo',
      message,
      reference,
      referenceType: cards.length === 1 ? 'CARD' : 'PROJECT',
    }).catch(() => { /* best-effort */ }),
  ))
  return { gerentes: gerentes.length, pendentes: cards.length }
}

/**
 * Recusa levar para a coluna de conclusão um card cujos responsáveis estão todos
 * inativos: ele precisa de outro responsável antes. Devolve a mensagem de erro, ou
 * null quando o movimento pode seguir.
 */
export async function bloqueioDeConclusao(cardId: string, columnId: string): Promise<string | null> {
  const coluna = await prisma.sprintColumn.findUnique({
    where: { id: columnId },
    select: { title: true, sprint: { select: { projectId: true } } },
  })
  if (!coluna || !isColunaConcluida(coluna.title) || !coluna.sprint?.projectId) return null
  const [responsaveis, inativos] = await Promise.all([
    prisma.cardResponsible.findMany({ where: { cardId }, select: { userId: true } }),
    idsMembrosInativos(coluna.sprint.projectId),
  ])
  return precisaDeOutroResponsavel(responsaveis.map(r => r.userId), inativos) ? MENSAGEM_RESPONSAVEL_INATIVO : null
}
