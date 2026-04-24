import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    list(tenantId: string, entity?: string, entityId?: string, page?: string, limit?: string): Promise<{
        id: string;
        tenantId: string;
        userId: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        details: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
        timestamp: Date;
    }[]>;
    log(tenantId: string, userId: string, body: {
        action: string;
        entity: string;
        entityId?: string;
        details?: object;
    }): Promise<{
        id: string;
        tenantId: string;
        userId: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        details: import("../../lib/generated/prisma/runtime/client").JsonValue | null;
        timestamp: Date;
    }>;
}
