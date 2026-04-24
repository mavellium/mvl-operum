import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    upload(file: Express.Multer.File, cardId: string, _userId: string): Promise<{
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
    getPresignedUrl(attachmentId: string): Promise<{
        url: string;
    }>;
    uploadAvatar(file: Express.Multer.File, userId: string): Promise<{
        url: string;
    }>;
    uploadLogo(file: Express.Multer.File, entityId: string, type: 'project' | 'stakeholder'): Promise<{
        url: string;
    }>;
}
