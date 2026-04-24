export declare class CommentService {
    listByCard(cardId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        cardId: string;
        content: string;
        type: import("../../lib/generated/prisma").$Enums.CommentType;
        reactions: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
    }[]>;
    create(cardId: string, userId: string, content: string, type?: 'COMMENT' | 'FEEDBACK'): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        cardId: string;
        content: string;
        type: import("../../lib/generated/prisma").$Enums.CommentType;
        reactions: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
    }>;
    update(id: string, userId: string, content: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        cardId: string;
        content: string;
        type: import("../../lib/generated/prisma").$Enums.CommentType;
        reactions: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
    }>;
    remove(id: string, userId: string): Promise<void>;
}
