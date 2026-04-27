"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinioService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let MinioService = class MinioService {
    constructor() {
        const endpoint = process.env.MINIO_ENDPOINT ?? 'minio';
        const port = Number(process.env.MINIO_PORT ?? 9000);
        const useSSL = process.env.MINIO_USE_SSL === 'true';
        this.s3 = new client_s3_1.S3Client({
            endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
            region: 'us-east-1',
            credentials: {
                accessKeyId: process.env.MINIO_ACCESS_KEY ?? '',
                secretAccessKey: process.env.MINIO_SECRET_KEY ?? '',
            },
            forcePathStyle: true,
        });
        this.bucket = process.env.MINIO_BUCKET ?? 'mvloperum';
        this.publicUrl = (process.env.MINIO_PUBLIC_URL ?? '').replace(/\/$/, '');
    }
    async upload(key, buffer, contentType) {
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        }));
        return `${this.publicUrl}/${this.bucket}/${key}`;
    }
    async delete(key) {
        try {
            await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        }
        catch {
        }
    }
    async getPresignedUrl(key, expiresIn = 3600) {
        return (0, s3_request_presigner_1.getSignedUrl)(this.s3, new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn });
    }
    extractKey(fileUrl) {
        const prefix = `${this.publicUrl}/${this.bucket}/`;
        return fileUrl.startsWith(prefix) ? fileUrl.slice(prefix.length) : null;
    }
    buildKey(type, id, fileName) {
        return `${type}/${id}/${fileName}`;
    }
};
exports.MinioService = MinioService;
exports.MinioService = MinioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MinioService);
//# sourceMappingURL=minio.service.js.map