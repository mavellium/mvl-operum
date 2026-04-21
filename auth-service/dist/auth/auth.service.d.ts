import { JwtService } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ChangePasswordDto, RequestResetDto, ValidateCodeDto, ResetPasswordDto } from './dto/password.dto';
export declare class AuthService {
    private readonly jwtService;
    private readonly redis;
    constructor(jwtService: JwtService, redis: RedisService);
    login(dto: LoginDto, subdomain?: string): Promise<{
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
    register(dto: RegisterDto): Promise<{
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
    logout(jti: string): Promise<void>;
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
    verify(token: string): Promise<{
        userId: string;
        tenantId: string;
        role: string;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<void>;
    alterarSenha(userId: string, newPassword: string): Promise<void>;
    requestPasswordReset(dto: RequestResetDto): Promise<{
        success: boolean;
    }>;
    validateResetCode(dto: ValidateCodeDto): Promise<{
        valid: boolean;
    }>;
    updateProfile(userId: string, data: {
        name?: string;
        email?: string;
        cargo?: string;
        departamento?: string;
        hourlyRate?: number;
        phone?: string;
        cep?: string;
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
        notes?: string;
        avatarUrl?: string;
    }): Promise<{
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
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
    }>;
}
