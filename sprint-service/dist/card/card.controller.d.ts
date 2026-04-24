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
        responsibles: {
            userId: string;
            cardId: string;
        }[];
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        startDate: Date | null;
        endDate: Date | null;
        sprintId: string;
        color: string;
        title: string;
        position: number;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        priority: string;
        tagsImport: string;
    })[]>;
    findOne(id: string): Promise<{
        comments: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            cardId: string;
            content: string;
            type: import("../../lib/generated/prisma").$Enums.CommentType;
            reactions: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
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
        responsibles: {
            userId: string;
            cardId: string;
        }[];
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        startDate: Date | null;
        endDate: Date | null;
        sprintId: string;
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
        sprintId: string;
        color: string;
        title: string;
        position: number;
        sprintColumnId: string | null;
        sprintPosition: number | null;
        priority: string;
        tagsImport: string;
    }>;
    update(id: string, body: unknown): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        startDate: Date | null;
        endDate: Date | null;
        sprintId: string;
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
