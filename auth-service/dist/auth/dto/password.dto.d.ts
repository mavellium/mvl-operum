import { z } from 'zod';
export declare const ChangePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
export declare const RequestResetSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const ValidateCodeSchema: z.ZodObject<{
    email: z.ZodString;
    code: z.ZodString;
}, z.core.$strip>;
export declare const ResetPasswordSchema: z.ZodObject<{
    email: z.ZodString;
    code: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
export declare const AlterarSenhaSchema: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export type RequestResetDto = z.infer<typeof RequestResetSchema>;
export type ValidateCodeDto = z.infer<typeof ValidateCodeSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type AlterarSenhaDto = z.infer<typeof AlterarSenhaSchema>;
