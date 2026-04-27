import { NotificationService } from './notification.service';
export declare class NotificationController {
    private readonly service;
    constructor(service: NotificationService);
    create(body: unknown): Promise<{
        id: string;
        userId: string;
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        title: string;
        message: string;
        reference: string | null;
        referenceType: string | null;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    findAll(userId: string, status?: string, limit?: string): Promise<{
        id: string;
        userId: string;
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        title: string;
        message: string;
        reference: string | null;
        referenceType: string | null;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }[]>;
    count(userId: string): Promise<{
        count: number;
    }>;
    findOne(id: string): Promise<{
        id: string;
        userId: string;
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        title: string;
        message: string;
        reference: string | null;
        referenceType: string | null;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    markAsRead(id: string): Promise<{
        id: string;
        userId: string;
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        title: string;
        message: string;
        reference: string | null;
        referenceType: string | null;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    markAsArchived(id: string): Promise<{
        id: string;
        userId: string;
        type: import("../../lib/generated/prisma").$Enums.NotificationType;
        title: string;
        message: string;
        reference: string | null;
        referenceType: string | null;
        status: import("../../lib/generated/prisma").$Enums.NotificationStatus;
        deletedAt: Date | null;
        createdAt: Date;
        readAt: Date | null;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<void>;
}
