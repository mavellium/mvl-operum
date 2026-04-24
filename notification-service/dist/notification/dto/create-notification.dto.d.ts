import { z } from 'zod';
export declare const CreateNotificationSchema: z.ZodObject<{
    userId: z.ZodString;
    type: z.ZodEnum<{
        COMMENT: "COMMENT";
        ASSIGNMENT: "ASSIGNMENT";
        UPDATE: "UPDATE";
        COMPLETION: "COMPLETION";
        MENTIONED: "MENTIONED";
        INVITATION: "INVITATION";
    }>;
    title: z.ZodString;
    message: z.ZodString;
    reference: z.ZodOptional<z.ZodString>;
    referenceType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
