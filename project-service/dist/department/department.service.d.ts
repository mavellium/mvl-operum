import { z } from 'zod';
export declare const CreateDepartmentSchema: z.ZodObject<{
    tenantId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    hourlyRate: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const UpdateDepartmentSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    hourlyRate: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type CreateDepartmentDto = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentDto = z.infer<typeof UpdateDepartmentSchema>;
export declare class DepartmentService {
    list(tenantId: string): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        active: boolean;
        hourlyRate: number | null;
    }[]>;
    findOne(id: string, tenantId: string): Promise<{
        users: {
            id: string;
            userId: string;
            departmentId: string;
        }[];
    } & {
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        active: boolean;
        hourlyRate: number | null;
    }>;
    create(dto: CreateDepartmentDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        active: boolean;
        hourlyRate: number | null;
    }>;
    update(id: string, tenantId: string, dto: UpdateDepartmentDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        active: boolean;
        hourlyRate: number | null;
    }>;
    remove(id: string, tenantId: string): Promise<void>;
    addUser(departmentId: string, tenantId: string, userId: string): Promise<{
        id: string;
        userId: string;
        departmentId: string;
    }>;
    removeUser(departmentId: string, tenantId: string, userId: string): Promise<void>;
}
