import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    upload(file: Express.Multer.File, cardId: string, userId: string): Promise<{
        id: string;
        cardId: string;
        fileName: string;
        fileType: string;
        filePath: string;
        fileSize: number;
        isCover: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listByCards(cardIdsParam: string, userId: string): Promise<{
        id: string;
        cardId: string;
        fileName: string;
        fileType: string;
        filePath: string;
        fileSize: number;
        isCover: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    setCover(attachmentId: string, body: {
        cardId: string;
    }, userId: string): Promise<{
        id: string;
        cardId: string;
        fileName: string;
        fileType: string;
        filePath: string;
        fileSize: number;
        isCover: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    rename(attachmentId: string, body: {
        fileName: string;
    }, userId: string): Promise<{
        id: string;
        cardId: string;
        fileName: string;
        fileType: string;
        filePath: string;
        fileSize: number;
        isCover: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(attachmentId: string, userId: string): Promise<void>;
    getPresignedUrl(attachmentId: string, userId: string): Promise<{
        url: string;
    }>;
    uploadAvatar(file: Express.Multer.File, userId: string): Promise<{
        url: string;
    }>;
    uploadLogo(file: Express.Multer.File, entityId: string, type: 'project' | 'stakeholder', userId: string): Promise<{
        url: string;
    }>;
}
