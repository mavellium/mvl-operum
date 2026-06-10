import { CardService } from './card.service';
export declare class CardController {
    private readonly cardService;
    constructor(cardService: CardService);
    listBySprint(sprintId: string): Promise<({
        tags: ({
            tag: {
                color: string;
                userId: string;
                name: string;
                id: string;
                tenantId: string;
            };
        } & {
            cardId: string;
            tagId: string;
        })[];
        attachments: {
            id: string;
            deletedAt: Date | null;
            cardId: string;
            fileName: string;
            fileType: string;
            filePath: string;
            fileSize: number;
            isCover: boolean;
            uploadedAt: Date;
        }[];
        responsibles: ({
            user: {
                name: string;
                id: string;
                tenantId: string;
                email: string;
            };
        } & {
            userId: string;
            cardId: string;
        })[];
    } & {
        title: string;
        description: string;
        color: string;
        position: number;
        sprintId: string | null;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        projectId: string | null;
        priority: string;
        startDate: Date | null;
        endDate: Date | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tagsImport: string;
    })[]>;
    listBacklog(projectId: string): Promise<({
        tags: ({
            tag: {
                color: string;
                userId: string;
                name: string;
                id: string;
                tenantId: string;
            };
        } & {
            cardId: string;
            tagId: string;
        })[];
        attachments: {
            id: string;
            deletedAt: Date | null;
            cardId: string;
            fileName: string;
            fileType: string;
            filePath: string;
            fileSize: number;
            isCover: boolean;
            uploadedAt: Date;
        }[];
        responsibles: ({
            user: {
                name: string;
                id: string;
                tenantId: string;
                email: string;
            };
        } & {
            userId: string;
            cardId: string;
        })[];
    } & {
        title: string;
        description: string;
        color: string;
        position: number;
        sprintId: string | null;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        projectId: string | null;
        priority: string;
        startDate: Date | null;
        endDate: Date | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tagsImport: string;
    })[]>;
    findOne(id: string): Promise<{
        comments: ({
            user: {
                name: string;
                id: string;
            };
        } & {
            type: import("../../lib/generated/prisma").$Enums.CommentType;
            userId: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            cardId: string;
            content: string;
            reactions: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
        })[];
        tags: ({
            tag: {
                color: string;
                userId: string;
                name: string;
                id: string;
                tenantId: string;
            };
        } & {
            cardId: string;
            tagId: string;
        })[];
        attachments: {
            id: string;
            deletedAt: Date | null;
            cardId: string;
            fileName: string;
            fileType: string;
            filePath: string;
            fileSize: number;
            isCover: boolean;
            uploadedAt: Date;
        }[];
        timeEntries: {
            description: string | null;
            userId: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            cardId: string;
            startedAt: Date;
            endedAt: Date | null;
            duration: number;
            isRunning: boolean;
            isManual: boolean;
        }[];
        responsibles: ({
            user: {
                name: string;
                id: string;
                tenantId: string;
                email: string;
            };
        } & {
            userId: string;
            cardId: string;
        })[];
    } & {
        title: string;
        description: string;
        color: string;
        position: number;
        sprintId: string | null;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        projectId: string | null;
        priority: string;
        startDate: Date | null;
        endDate: Date | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tagsImport: string;
    }>;
    create(body: unknown): Promise<{
        title: string;
        description: string;
        color: string;
        position: number;
        sprintId: string | null;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        projectId: string | null;
        priority: string;
        startDate: Date | null;
        endDate: Date | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tagsImport: string;
    }>;
    listMovements(id: string): Promise<{
        reason: string | null;
        userId: string | null;
        id: string;
        cardId: string;
        fromColumnId: string | null;
        fromColumnTitle: string | null;
        toColumnId: string | null;
        toColumnTitle: string | null;
        movedAt: Date;
    }[]>;
    update(id: string, body: unknown, userId?: string): Promise<{
        title: string;
        description: string;
        color: string;
        position: number;
        sprintId: string | null;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        projectId: string | null;
        priority: string;
        startDate: Date | null;
        endDate: Date | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tagsImport: string;
    }>;
    remove(id: string): Promise<void>;
    addTag(cardId: string, tagId: string): Promise<{
        cardId: string;
        tagId: string;
    }>;
    removeTag(cardId: string, tagId: string): Promise<void>;
    addResponsible(cardId: string, userId: string): Promise<{
        userId: string;
        cardId: string;
    }>;
    removeResponsible(cardId: string, userId: string): Promise<void>;
    listTags(tenantId: string): Promise<{
        color: string;
        userId: string;
        name: string;
        id: string;
        tenantId: string;
    }[]>;
    createTag(tenantId: string, userId: string, body: {
        name: string;
        color?: string;
    }): Promise<{
        color: string;
        userId: string;
        name: string;
        id: string;
        tenantId: string;
    }>;
    deleteTag(tagId: string): Promise<void>;
}
