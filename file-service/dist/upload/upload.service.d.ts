import { MinioService } from '../minio/minio.service';
export declare class UploadService {
    private readonly minio;
    private readonly prisma;
    constructor(minio: MinioService);
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
    listByCards(cardIds: string[], userId: string): Promise<{
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
    setCover(attachmentId: string, cardId: string, userId: string): Promise<{
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
    rename(attachmentId: string, fileName: string, userId: string): Promise<{
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
    uploadLogo(file: Express.Multer.File, entityId: string, type: 'project' | 'stakeholder'): Promise<{
        url: string;
    }>;
}
