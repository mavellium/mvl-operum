import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
export declare class AuthController {
    private readonly authService;
    private readonly jwtService;
    constructor(authService: AuthService, jwtService: JwtService);
    login(body: unknown): Promise<{
        token: string;
        forcePasswordChange: boolean;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            tenantId: string;
            avatarUrl: string;
        };
    }>;
    register(body: unknown): Promise<{
        name: string;
        id: string;
        status: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        email: string;
        role: string;
        avatarUrl: string | null;
        cargo: string | null;
        departamento: string | null;
        hourlyRate: number;
        phone: string | null;
        cep: string | null;
        logradouro: string | null;
        numero: string | null;
        complemento: string | null;
        bairro: string | null;
        cidade: string | null;
        estado: string | null;
        notes: string | null;
        isActive: boolean;
        mfaEnabled: boolean;
        mfaSecret: string | null;
        loginAttempts: number;
        forcePasswordChange: boolean;
        lastLogin: Date | null;
        tokenVersion: number;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
    }>;
    logout(authorization: string): Promise<void>;
    me(userId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        email: string;
        role: string;
        avatarUrl: string;
        cargo: string;
        departamento: string;
        hourlyRate: number;
        isActive: boolean;
        forcePasswordChange: boolean;
    }>;
    verify(authorization: string): Promise<{
        userId: string;
        tenantId: string;
        role: string;
    }>;
    requestReset(body: unknown): Promise<{
        success: boolean;
    }>;
    validateCode(body: unknown): Promise<{
        valid: boolean;
    }>;
    resetPassword(body: unknown): Promise<{
        success: boolean;
    }>;
    changePassword(userId: string, body: unknown): Promise<void>;
    updateProfile(userId: string, body: Record<string, unknown>): Promise<{
        name: string;
        id: string;
        tenantId: string;
        email: string;
        role: string;
        avatarUrl: string;
        cargo: string;
        departamento: string;
        hourlyRate: number;
        phone: string;
        cep: string;
        logradouro: string;
        numero: string;
        complemento: string;
        bairro: string;
        cidade: string;
        estado: string;
        notes: string;
        isActive: boolean;
        forcePasswordChange: boolean;
    }>;
    alterarSenha(userId: string, body: unknown): Promise<void>;
}
