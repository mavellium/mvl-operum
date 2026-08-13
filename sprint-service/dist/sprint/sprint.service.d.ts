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
    create(dto: CreateSprintDto): Promise<{
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
    update(id: string, dto: UpdateSprintDto): Promise<{
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
    createColumn(sprintId: string, dto: CreateColumnDto): Promise<{
        title: string;
        position: number;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
    }>;
    updateColumn(columnId: string, dto: Partial<CreateColumnDto>): Promise<{
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
