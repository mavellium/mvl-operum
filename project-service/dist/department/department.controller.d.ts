import { DepartmentService } from './department.service';
export declare class DepartmentController {
    private readonly departmentService;
    constructor(departmentService: DepartmentService);
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
    create(body: unknown, tenantId: string): Promise<{
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
    update(id: string, tenantId: string, body: unknown): Promise<{
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
    addUser(departmentId: string, tenantId: string, body: {
        userId: string;
    }): Promise<{
        id: string;
        userId: string;
        departmentId: string;
    }>;
    removeUser(departmentId: string, userId: string, tenantId: string): Promise<void>;
}
