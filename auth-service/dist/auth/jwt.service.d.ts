export interface JwtPayload {
    userId: string;
    tenantId: string;
    role: string;
    tokenVersion: number;
    jti: string;
    exp?: number;
}
export declare class JwtService {
    private privateKeyPem;
    private publicKeyPem;
    constructor();
    sign(payload: Omit<JwtPayload, 'jti'>): Promise<{
        token: string;
        jti: string;
    }>;
    verify(token: string): Promise<JwtPayload | null>;
}
