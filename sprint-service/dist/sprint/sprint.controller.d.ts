import { SprintService } from './sprint.service';
export declare class SprintController {
    private readonly sprintService;
    constructor(sprintService: SprintService);
    list(projectId?: string): Promise<({
        sprintColumns: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            sprintId: string;
            title: string;
            position: number;
        }[];
    } & {
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("../../lib/generated/prisma").$Enums.SprintStatus;
        startDate: Date | null;
        endDate: Date | null;
        qualidade: number | null;
        dificuldade: number | null;
        projectId: string | null;
        createdBy: string | null;
    })[]>;
    findOne(id: string): Promise<{
        cards: {
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
        }[];
        sprintColumns: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            sprintId: string;
            title: string;
            position: number;
        }[];
    } & {
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("../../lib/generated/prisma").$Enums.SprintStatus;
        startDate: Date | null;
        endDate: Date | null;
        qualidade: number | null;
        dificuldade: number | null;
        projectId: string | null;
        createdBy: string | null;
    }>;
    create(body: unknown): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("../../lib/generated/prisma").$Enums.SprintStatus;
        startDate: Date | null;
        endDate: Date | null;
        qualidade: number | null;
        dificuldade: number | null;
        projectId: string | null;
        createdBy: string | null;
    }>;
    update(id: string, body: unknown): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: import("../../lib/generated/prisma").$Enums.SprintStatus;
        startDate: Date | null;
        endDate: Date | null;
        qualidade: number | null;
        dificuldade: number | null;
        projectId: string | null;
        createdBy: string | null;
    }>;
    remove(id: string): Promise<void>;
    listColumns(sprintId: string): Promise<({
        cards: ({
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
        })[];
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
        title: string;
        position: number;
    })[]>;
    createColumn(sprintId: string, body: unknown): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
        title: string;
        position: number;
    }>;
    updateColumn(columnId: string, body: {
        title?: string;
        position?: number;
    }): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
        title: string;
        position: number;
    }>;
    deleteColumn(columnId: string): Promise<void>;
}
