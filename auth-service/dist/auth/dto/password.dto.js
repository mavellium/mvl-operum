"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlterarSenhaSchema = exports.ResetPasswordSchema = exports.ValidateCodeSchema = exports.RequestResetSchema = exports.ChangePasswordSchema = void 0;
const zod_1 = require("zod");
exports.ChangePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});
exports.RequestResetSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.ValidateCodeSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().min(6),
});
exports.ResetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().min(6),
    newPassword: zod_1.z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});
exports.AlterarSenhaSchema = zod_1.z.object({
    password: zod_1.z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});
//# sourceMappingURL=password.dto.js.map