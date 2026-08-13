import { SprintService } from './sprint.service';
export declare class SprintController {
    private readonly sprintService;
    constructor(sprintService: SprintService);
    list(projectId?: string): Promise<({
        sprintColumns: {
            title: string;
            position: number;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            sprintId: string;
        }[];
    } & {
        name: string;
        description: string | null;
        status: import("../../lib/generated/prisma").$Enums.SprintStatus;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        createdBy: string | null;
        qualidade: number | null;
        dificuldade: number | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOne(id: string): Promise<{
        cards: {
            description: string;
            startDate: Date | null;
            endDate: Date | null;
            projectId: string | null;
            title: string;
            position: number;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            sprintId: string | null;
            color: string;
            sprintColumnId: string | null;
            sprintPosition: number | null;
            priority: string;
            tagsImport: string;
        }[];
        sprintColumns: {
            title: string;
            position: number;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            sprintId: string;
        }[];
    } & {
        name: string;
        description: string | null;
        status: import("../../lib/generated/prisma").$Enums.SprintStatus;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        createdBy: string | null;
        qualidade: number | null;
        dificuldade: number | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(body: unknown): Promise<{
        name: string;
        description: string | null;
        status: import("../../lib/generated/prisma").$Enums.SprintStatus;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        createdBy: string | null;
        qualidade: number | null;
        dificuldade: number | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, body: unknown): Promise<{
        name: string;
        description: string | null;
        status: import("../../lib/generated/prisma").$Enums.SprintStatus;
        startDate: Date | null;
        endDate: Date | null;
        projectId: string | null;
        createdBy: string | null;
        qualidade: number | null;
        dificuldade: number | null;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
                description: string | null;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
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
            description: string;
            startDate: Date | null;
            endDate: Date | null;
            projectId: string | null;
            title: string;
            position: number;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            sprintId: string | null;
            color: string;
            sprintColumnId: string | null;
            sprintPosition: number | null;
            priority: string;
            tagsImport: string;
        })[];
    } & {
        title: string;
        position: number;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
    })[]>;
    createColumn(sprintId: string, body: unknown): Promise<{
        title: string;
        position: number;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
    }>;
    updateColumn(columnId: string, body: {
        title?: string;
        position?: number;
    }): Promise<{
        title: string;
        position: number;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
    }>;
    deleteColumn(columnId: string): Promise<void>;
}
