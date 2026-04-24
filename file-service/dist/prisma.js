"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const prisma_1 = require("../lib/generated/prisma");
const globalForPrisma = globalThis;
function createPrismaClient() {
    const pool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        keepAlive: true,
        keepAliveInitialDelayMillis: 0,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => console.error('[prisma] idle client error', err.message));
    const adapter = new adapter_pg_1.PrismaPg(pool);
    return new prisma_1.PrismaClient({ adapter });
}
exports.prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
//# sourceMappingURL=prisma.js.map