export declare class TenantService {
    private readonly prisma;
    findBySubdomain(subdomain: string): Promise<{
        name: string;
        id: string;
        subdomain: string;
        status: import("../../lib/generated/prisma").$Enums.TenantStatus;
    }>;
}
