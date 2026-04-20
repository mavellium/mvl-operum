import 'dotenv/config'
import prisma from '../lib/prisma' // 👈 Voltamos a usar a sua configuração pronta!
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Starting seed...')

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in .env')
  }

  // 1. Tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'mavellium' },
    update: {},
    create: {
      name: 'MVL Operum',
      subdomain: 'mavellium',
      status: 'ACTIVE',
    },
  })

  // 2. Password
  const password = process.env.SEED_ADMIN_PASSWORD
    ?? (() => { throw new Error('SEED_ADMIN_PASSWORD env var is required') })()
  const passwordHash = await bcrypt.hash(password, 12)

  // 3. User
  const user = await prisma.user.upsert({
    where: {
      email_tenantId: {
        email: 'vinicius.mota@mavellium.com.br',
        tenantId: tenant.id,
      },
    },
    update: {
      passwordHash,
      role: 'admin',
    },
    create: {
      name: 'Vinícius Tavares Mota',
      email: 'vinicius.mota@mavellium.com.br',
      passwordHash,
      role: 'admin',
      tenantId: tenant.id,
      isActive: true,
      status: 'active',
    },
  })

  console.log('✅ Seed completed!')
  console.log({
    email: user.email,
    tenant: tenant.name,
  })
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })