import { createParamDecorator, ExecutionContext, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { prisma } from '../prisma'

/**
 * Lê o x-tenant-id injetado pelo api-gateway (nunca vem do cliente — o gateway
 * remove o header recebido e reescreve a partir do JWT/PAT verificado).
 * Toda rota de domínio exige o header: sem ele não há como escopar a consulta.
 */
export function tenantIdFromHeaders(headers: Record<string, string | string[] | undefined>): string {
  const tenantId = headers['x-tenant-id']
  if (typeof tenantId !== 'string' || !tenantId) throw new UnauthorizedException('Tenant não identificado')
  return tenantId
}

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string =>
  tenantIdFromHeaders(ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>().headers),
)

/** Campos públicos de usuário embutidos em respostas (responsáveis, autores). */
export const PUBLIC_USER_SELECT = { id: true, name: true, email: true } as const

// Sprint e Card não têm tenantId próprio — o tenant vem do projeto.
// Card pode estar no backlog (projectId) ou numa sprint (sprint.projectId).
export const sprintInTenant = (tenantId: string) => ({ project: { tenantId } })
export const cardInTenant = (tenantId: string) => ({
  OR: [{ project: { tenantId } }, { sprint: { project: { tenantId } } }],
})

// Recursos de outro tenant respondem 404 (não 403) para não confirmar a existência do id.

export async function assertProject(tenantId: string, projectId: string): Promise<void> {
  const found = await prisma.project.findFirst({ where: { id: projectId, tenantId }, select: { id: true } })
  if (!found) throw new NotFoundException('Projeto não encontrado')
}

export async function assertSprint(tenantId: string, sprintId: string): Promise<void> {
  const found = await prisma.sprint.findFirst({
    where: { id: sprintId, deletedAt: null, ...sprintInTenant(tenantId) },
    select: { id: true },
  })
  if (!found) throw new NotFoundException('Sprint não encontrada')
}

/** Coluna precisa pertencer à sprint informada (que por sua vez precisa ser do tenant). */
export async function assertColumn(tenantId: string, sprintId: string, columnId: string): Promise<void> {
  const found = await prisma.sprintColumn.findFirst({
    where: { id: columnId, sprintId, deletedAt: null, sprint: sprintInTenant(tenantId) },
    select: { id: true },
  })
  if (!found) throw new NotFoundException('Coluna não encontrada')
}

export async function assertCard(tenantId: string, cardId: string): Promise<void> {
  const found = await prisma.card.findFirst({
    where: { id: cardId, deletedAt: null, ...cardInTenant(tenantId) },
    select: { id: true },
  })
  if (!found) throw new NotFoundException('Card não encontrado')
}

export async function assertTag(tenantId: string, tagId: string): Promise<void> {
  const found = await prisma.tag.findFirst({ where: { id: tagId, tenantId }, select: { id: true } })
  if (!found) throw new NotFoundException('Tag não encontrada')
}

export async function assertUserInTenant(tenantId: string, userId: string): Promise<void> {
  const found = await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } })
  if (!found) throw new NotFoundException('Usuário não encontrado')
}

export async function assertTimeEntry(tenantId: string, entryId: string): Promise<void> {
  const found = await prisma.timeEntry.findFirst({
    where: { id: entryId, deletedAt: null, card: cardInTenant(tenantId) },
    select: { id: true },
  })
  if (!found) throw new NotFoundException('Time entry não encontrada')
}
