"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterSchema = void 0;
const zod_1 = require("zod");
exports.RegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    tenantId: zod_1.z.string().min(1, 'tenantId é obrigatório'),
    role: zod_1.z.enum(['admin', 'gerente', 'member']).optional().default('member'),
    forcePasswordChange: zod_1.z.boolean().optional().default(false),
});
//# sourceMappingURL=register.dto.js.map