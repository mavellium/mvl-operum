import { CommentService } from './comment.service';
export declare class CommentController {
    private readonly commentService;
    constructor(commentService: CommentService);
    list(cardId: string): Promise<{
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
    create(cardId: string, userId: string, body: {
        content: string;
        type?: 'COMMENT' | 'FEEDBACK';
    }): Promise<{
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
    update(id: string, userId: string, body: {
        content: string;
    }): Promise<{
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
