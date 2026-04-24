import { RoleService } from './role.service';
export declare class RoleController {
    private readonly roleService;
    constructor(roleService: RoleService);
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
    createRole(body: unknown, tenantId: string): Promise<{
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
    updateRole(id: string, tenantId: string, body: unknown): Promise<{
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
    assignPermission(roleId: string, permissionId: string, tenantId: string): Promise<{
        id: string;
        roleId: string;
        permissionId: string;
    }>;
    removePermission(roleId: string, permissionId: string, tenantId: string): Promise<void>;
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
    createPermission(body: unknown): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        resource: string;
        action: string;
    }>;
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
    assignUserProjectRole(projectId: string, body: {
        userId: string;
        roleId: string;
    }): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        projectId: string;
        roleId: string;
    }>;
    removeUserProjectRole(projectId: string, userId: string): Promise<void>;
}
