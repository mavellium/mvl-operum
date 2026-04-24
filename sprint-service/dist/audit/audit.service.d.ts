export declare class AuditService {
    log(tenantId: string, userId: string | undefined, action: string, entity: string, entityId?: string, details?: object): Promise<{
        id: string;
        tenantId: string;
        userId: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        details: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
        timestamp: Date;
    }>;
    list(tenantId: string, entity?: string, entityId?: string, page?: number, limit?: number): Promise<{
        id: string;
        tenantId: string;
        userId: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        details: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
        timestamp: Date;
    }[]>;
}
