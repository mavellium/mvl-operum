import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private client;
    private available;
    private readonly logger;
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    setSession(jti: string, payload: object): Promise<void>;
    getSession(jti: string): Promise<object | null>;
    deleteSession(jti: string): Promise<void>;
    incr(key: string): Promise<number>;
    expire(key: string, ttlSeconds: number): Promise<void>;
}
