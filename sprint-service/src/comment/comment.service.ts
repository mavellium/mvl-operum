import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { prisma } from '../prisma'
import { assertCard } from '../common/tenant-scope'

@Injectable()
export class CommentService {
  async listByCard(tenantId: string, cardId: string) {
    await assertCard(tenantId, cardId)
    return prisma.comment.findMany({
      where: { cardId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    })
  }

  async create(tenantId: string, cardId: string, userId: string, content: string, type: 'COMMENT' | 'FEEDBACK' = 'COMMENT') {
    await assertCard(tenantId, cardId)
    return prisma.comment.create({
      data: { cardId, userId, content, type },
      include: { user: { select: { id: true, name: true } } },
    })
  }

  async update(tenantId: string, cardId: string, id: string, userId: string, content: string) {
    await assertCard(tenantId, cardId)
    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment || comment.deletedAt || comment.cardId !== cardId) throw new NotFoundException('Comentário não encontrado')
    if (comment.userId !== userId) throw new ForbiddenException('Sem permissão para editar')
    return prisma.comment.update({ where: { id }, data: { content } })
  }

  async remove(tenantId: string, cardId: string, id: string, userId: string) {
    await assertCard(tenantId, cardId)
    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment || comment.deletedAt || comment.cardId !== cardId) throw new NotFoundException('Comentário não encontrado')
    if (comment.userId !== userId) throw new ForbiddenException('Sem permissão para remover')
    await prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
