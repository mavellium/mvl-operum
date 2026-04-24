"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateNotificationSchema = void 0;
const zod_1 = require("zod");
exports.CreateNotificationSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    type: zod_1.z.enum(['COMMENT', 'ASSIGNMENT', 'UPDATE', 'COMPLETION', 'MENTIONED', 'INVITATION']),
    title: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
    reference: zod_1.z.string().optional(),
    referenceType: zod_1.z.string().optional(),
});
//# sourceMappingURL=create-notification.dto.js.map