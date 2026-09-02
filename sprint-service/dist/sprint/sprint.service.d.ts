import { z } from 'zod';
export declare const CreateSprintSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        PLANNED: "PLANNED";
        ACTIVE: "ACTIVE";
        COMPLETED: "COMPLETED";
    }>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const UpdateSprintSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        PLANNED: "PLANNED";
        ACTIVE: "ACTIVE";
        COMPLETED: "COMPLETED";
    }>>>;
    startDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    endDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    projectId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    createdBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    qualidade: z.ZodOptional<z.ZodNumber>;
    dificuldade: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const CreateColumnSchema: z.ZodObject<{
    title: z.ZodString;
    position: z.ZodNumber;
}, z.core.$strip>;
export type CreateSprintDto = z.infer<typeof CreateSprintSchema>;
export type UpdateSprintDto = z.infer<typeof UpdateSprintSchema>;
export type CreateColumnDto = z.infer<typeof CreateColumnSchema>;
export declare const DEFAULT_SPRINT_COLUMNS: string[];
export declare class SprintService {
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
    create(dto: CreateSprintDto): Promise<{
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
    update(id: string, dto: UpdateSprintDto): Promise<{
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
    createColumn(sprintId: string, dto: CreateColumnDto): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
        title: string;
        position: number;
    }>;
    updateColumn(columnId: string, dto: Partial<CreateColumnDto>): Promise<{
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
