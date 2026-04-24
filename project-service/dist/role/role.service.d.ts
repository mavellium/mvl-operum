import { z } from 'zod';
export declare const CreateRoleSchema: z.ZodObject<{
    tenantId: z.ZodString;
    name: z.ZodString;
    nameKey: z.ZodString;
    scope: z.ZodEnum<{
        TENANT: "TENANT";
        PROJETO: "PROJETO";
    }>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const UpdateRoleSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    nameKey: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodEnum<{
        TENANT: "TENANT";
        PROJETO: "PROJETO";
    }>>;
}, z.core.$strip>;
export declare const CreatePermissionSchema: z.ZodObject<{
    name: z.ZodString;
    resource: z.ZodString;
    action: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;
export type CreatePermissionDto = z.infer<typeof CreatePermissionSchema>;
export declare class RoleService {
    listRoles(tenantId: string): Promise<({
        permissions: ({
            permission: {
                name: string;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                resource: string;
                action: string;
            };
        } & {
            id: string;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        nameKey: string;
        scope: import("../../lib/generated/prisma").$Enums.RoleScope;
    })[]>;
    findRole(id: string, tenantId: string): Promise<{
        permissions: ({
            permission: {
                name: string;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                resource: string;
                action: string;
            };
        } & {
            id: string;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        nameKey: string;
        scope: import("../../lib/generated/prisma").$Enums.RoleScope;
    }>;
    createRole(dto: CreateRoleDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        nameKey: string;
        scope: import("../../lib/generated/prisma").$Enums.RoleScope;
    }>;
    updateRole(id: string, tenantId: string, dto: UpdateRoleDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        nameKey: string;
        scope: import("../../lib/generated/prisma").$Enums.RoleScope;
    }>;
    deleteRole(id: string, tenantId: string): Promise<void>;
    assignPermission(roleId: string, tenantId: string, permissionId: string): Promise<{
        id: string;
        roleId: string;
        permissionId: string;
    }>;
    removePermission(roleId: string, tenantId: string, permissionId: string): Promise<void>;
    listPermissions(): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        resource: string;
        action: string;
    }[]>;
    createPermission(dto: CreatePermissionDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        resource: string;
        action: string;
    }>;
    assignUserProjectRole(userId: string, projectId: string, roleId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        projectId: string;
        roleId: string;
    }>;
    removeUserProjectRole(userId: string, projectId: string): Promise<void>;
    getUserProjectRoles(projectId: string): Promise<({
        role: {
            permissions: ({
                permission: {
                    name: string;
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    resource: string;
                    action: string;
                };
            } & {
                id: string;
                roleId: string;
                permissionId: string;
            })[];
        } & {
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            description: string | null;
            nameKey: string;
            scope: import("../../lib/generated/prisma").$Enums.RoleScope;
        };
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        projectId: string;
        roleId: string;
    })[]>;
}
