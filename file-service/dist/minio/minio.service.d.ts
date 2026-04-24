export declare class MinioService {
    private readonly s3;
    private readonly bucket;
    private readonly publicUrl;
    constructor();
    upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
    delete(key: string): Promise<void>;
    getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
    extractKey(fileUrl: string): string | null;
    buildKey(type: 'uploads' | 'avatars' | 'logos', id: string, fileName: string): string;
}
