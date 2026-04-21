"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const SESSION_TTL = 7 * 24 * 60 * 60;
const IS_DEV = process.env.NODE_ENV !== 'production';
let RedisService = RedisService_1 = class RedisService {
    constructor() {
        this.available = true;
        this.logger = new common_1.Logger(RedisService_1.name);
    }
    onModuleInit() {
        this.client = new ioredis_1.default({
            host: process.env.REDIS_HOST ?? 'redis',
            port: Number(process.env.REDIS_PORT ?? 6379),
            password: process.env.REDIS_PASSWORD,
            lazyConnect: true,
            maxRetriesPerRequest: IS_DEV ? 1 : 20,
            retryStrategy: IS_DEV ? () => null : undefined,
        });
        this.client.on('error', () => {
            if (this.available) {
                this.logger.warn('Redis indisponível — sessões em memória desativadas (modo dev)');
                this.available = false;
            }
        });
        this.client.on('connect', () => {
            this.available = true;
            this.logger.log('Redis conectado');
        });
    }
    async onModuleDestroy() {
        await this.client.quit().catch(() => undefined);
    }
    async setSession(jti, payload) {
        if (!this.available)
            return;
        await this.client.set(`session:${jti}`, JSON.stringify(payload), 'EX', SESSION_TTL).catch(() => undefined);
    }
    async getSession(jti) {
        if (!this.available)
            return { dev: true };
        const raw = await this.client.get(`session:${jti}`).catch(() => null);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    async deleteSession(jti) {
        if (!this.available)
            return;
        await this.client.del(`session:${jti}`).catch(() => undefined);
    }
    async incr(key) {
        if (!this.available)
            return 0;
        return this.client.incr(key).catch(() => 0);
    }
    async expire(key, ttlSeconds) {
        if (!this.available)
            return;
        await this.client.expire(key, ttlSeconds).catch(() => undefined);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map