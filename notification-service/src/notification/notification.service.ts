import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient, Prisma, NotificationStatus } from '../../lib/generated/prisma'
import { CreateNotificationDto } from './dto/create-notification.dto'

@Injectable()
export class NotificationService {
  private readonly prisma = new PrismaClient()

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        reference: dto.reference,
        referenceType: dto.referenceType,
      },
    })
  }

  async findAllByUser(userId: string, status?: string, limit = 50) {
    const where: Prisma.NotificationWhereInput = { userId, deletedAt: null }
    if (status) where.status = status as NotificationStatus

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async findById(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id, deletedAt: null },
    })
    if (!notification) throw new NotFoundException('Notification not found')
    return notification
  }

  async markAsRead(id: string) {
    await this.findById(id)
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    })
  }

  async markAsArchived(id: string) {
    await this.findById(id)
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    })
  }

  async softDelete(id: string) {
    await this.findById(id)
    return this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, status: 'UNREAD', deletedAt: null },
    })
  }
}
