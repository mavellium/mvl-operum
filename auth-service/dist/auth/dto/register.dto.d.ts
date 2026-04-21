import { z } from 'zod';
export declare const RegisterSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    tenantId: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        admin: "admin";
        gerente: "gerente";
        member: "member";
    }>>>;
    forcePasswordChange: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
