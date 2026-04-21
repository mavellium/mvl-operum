import { TenantService } from './tenant.service';
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    findBySubdomain(subdomain: string): Promise<{
        name: string;
        id: string;
        subdomain: string;
        status: import("../../lib/generated/prisma").$Enums.TenantStatus;
    }>;
}
