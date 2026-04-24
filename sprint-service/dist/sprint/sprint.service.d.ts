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
            sprintId: string;
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
    listColumns(sprintId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        sprintId: string;
        title: string;
        position: number;
    }[]>;
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
