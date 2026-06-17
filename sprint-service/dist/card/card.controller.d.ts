import { CardService } from './card.service';
export declare class CardController {
    private readonly cardService;
    constructor(cardService: CardService);
    listBySprint(sprintId: string): Promise<({
        tags: ({
            tag: {
                name: string;
                id: string;
                tenantId: string;
                userId: string;
                color: string;
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
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        sprintId: string | null;
        color: string;
        title: string;
        position: number;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        priority: string;
        tagsImport: string;
    })[]>;
    listBacklog(projectId: string): Promise<({
        tags: ({
            tag: {
                name: string;
                id: string;
                tenantId: string;
                userId: string;
                color: string;
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
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        sprintId: string | null;
        color: string;
        title: string;
        position: number;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        priority: string;
        tagsImport: string;
    })[]>;
    findOne(id: string): Promise<{
        comments: ({
            user: {
                name: string;
                id: string;
            };
        } & {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            cardId: string;
            content: string;
            type: import("../../lib/generated/prisma").$Enums.CommentType;
            reactions: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
        })[];
        tags: ({
            tag: {
                name: string;
                id: string;
                tenantId: string;
                userId: string;
                color: string;
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
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            description: string | null;
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
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        sprintId: string | null;
        color: string;
        title: string;
        position: number;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        priority: string;
        tagsImport: string;
    }>;
    create(body: unknown): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        sprintId: string | null;
        color: string;
        title: string;
        position: number;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        priority: string;
        tagsImport: string;
    }>;
    listMovements(id: string): Promise<{
        id: string;
        userId: string | null;
        cardId: string;
        fromColumnId: string | null;
        fromColumnTitle: string | null;
        toColumnId: string | null;
        toColumnTitle: string | null;
        reason: string | null;
        movedAt: Date;
    }[]>;
    update(id: string, body: unknown, userId?: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        sprintId: string | null;
        color: string;
        title: string;
        position: number;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        priority: string;
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
        name: string;
        id: string;
        tenantId: string;
        userId: string;
        color: string;
    }[]>;
    createTag(tenantId: string, userId: string, body: {
        name: string;
        color?: string;
    }): Promise<{
        name: string;
        id: string;
        tenantId: string;
        userId: string;
        color: string;
    }>;
    deleteTag(tagId: string): Promise<void>;
}
