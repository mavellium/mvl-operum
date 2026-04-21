"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jose_1 = require("jose");
const ioredis_1 = __importDefault(require("ioredis"));
// Routes that don't require authentication
const PUBLIC_PATHS = [
    '/auth/login',
    '/auth/tenants/',
    '/auth/password/request-reset',
    '/auth/password/validate-code',
    '/auth/password/reset',
    '/auth/verify',
    '/health',
];
function normalizePem(raw) {
    return raw.replace(/\\n/g, '\n');
}
let redisClient = null;
function getRedis() {
    if (!redisClient) {
        redisClient = new ioredis_1.default({
            host: process.env.REDIS_HOST ?? 'redis',
            port: Number(process.env.REDIS_PORT ?? 6379),
            password: process.env.REDIS_PASSWORD,
            lazyConnect: true,
        });
    }
    return redisClient;
}
async function verifyToken(token) {
    const publicKeyPem = process.env.JWT_PUBLIC_KEY
        ? normalizePem(process.env.JWT_PUBLIC_KEY)
        : null;
    if (publicKeyPem) {
        try {
            const publicKey = await (0, jose_1.importSPKI)(publicKeyPem, 'RS256');
            const { payload } = await (0, jose_1.jwtVerify)(token, publicKey, { algorithms: ['RS256'] });
            return payload;
        }
        catch {
            // fall through
        }
    }
    const secret = process.env.SESSION_SECRET;
    if (secret) {
        try {
            const secretKey = new TextEncoder().encode(secret);
            const { payload } = await (0, jose_1.jwtVerify)(token, secretKey, { algorithms: ['HS256'] });
            return payload;
        }
        catch {
            return null;
        }
    }
    return null;
}
function authMiddleware() {
    return async (req, res, next) => {
        const path = req.path;
        // Skip auth for public paths
        if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
            return next();
        }
        const authorization = req.headers['authorization'];
        const token = authorization?.replace('Bearer ', '') ?? req.cookies?.session;
        if (!token) {
            return res.status(401).json({ error: 'Não autorizado' });
        }
        const payload = await verifyToken(token);
        if (!payload) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        // Verify session in Redis (if jti present)
        if (payload.jti) {
            try {
                const redis = getRedis();
                const session = await redis.get(`session:${payload.jti}`);
                if (!session) {
                    return res.status(401).json({ error: 'Sessão expirada' });
                }
            }
            catch {
                // Redis unavailable — allow request (fail open in degraded mode)
            }
        }
        // Inject context headers for downstream services
        req.headers['x-user-id'] = payload.userId;
        req.headers['x-tenant-id'] = payload.tenantId;
        req.headers['x-user-role'] = payload.role;
        next();
    };
}
