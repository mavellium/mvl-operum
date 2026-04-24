import { MinioService } from '../minio/minio.service';
export declare class UploadService {
    private readonly minio;
    private readonly prisma;
    constructor(minio: MinioService);
    upload(file: Express.Multer.File, cardId: string): Promise<{
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
    delete(attachmentId: string, _userId?: string): Promise<void>;
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
