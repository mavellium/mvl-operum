import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

function createClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 10_000,
    max: 10,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
