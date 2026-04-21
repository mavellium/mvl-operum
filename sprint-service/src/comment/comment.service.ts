import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { prisma } from '../prisma'

@Injectable()
export class CommentService {
  async listByCard(cardId: string) {
    return prisma.comment.findMany({
      where: { cardId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
  }

  async create(cardId: string, userId: string, content: string, type: 'COMMENT' | 'FEEDBACK' = 'COMMENT') {
    return prisma.comment.create({ data: { cardId, userId, content, type } })
  }

  async update(id: string, userId: string, content: string) {
    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment || comment.deletedAt) throw new NotFoundException('Comentário não encontrado')
    if (comment.userId !== userId) throw new ForbiddenException('Sem permissão para editar')
    return prisma.comment.update({ where: { id }, data: { content } })
  }

  async remove(id: string, userId: string) {
    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment || comment.deletedAt) throw new NotFoundException('Comentário não encontrado')
    if (comment.userId !== userId) throw new ForbiddenException('Sem permissão para remover')
    await prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
