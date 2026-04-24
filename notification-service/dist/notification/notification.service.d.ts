import { CreateNotificationDto } from './dto/create-notification.dto';
export declare class NotificationService {
    private readonly prisma;
    create(dto: CreateNotificationDto): Promise<{
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        message: string;
        userId: string;
        title: string;
        reference: string | null;
        referenceType: string | null;
        id: string;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    findAllByUser(userId: string, status?: string, limit?: number): Promise<{
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        message: string;
        userId: string;
        title: string;
        reference: string | null;
        referenceType: string | null;
        id: string;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }[]>;
    findById(id: string): Promise<{
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        message: string;
        userId: string;
        title: string;
        reference: string | null;
        referenceType: string | null;
        id: string;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    markAsRead(id: string): Promise<{
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        message: string;
        userId: string;
        title: string;
        reference: string | null;
        referenceType: string | null;
        id: string;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    markAsArchived(id: string): Promise<{
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        message: string;
        userId: string;
        title: string;
        reference: string | null;
        referenceType: string | null;
        id: string;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    softDelete(id: string): Promise<{
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        message: string;
        userId: string;
        title: string;
        reference: string | null;
        referenceType: string | null;
        id: string;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    countUnread(userId: string): Promise<number>;
}
