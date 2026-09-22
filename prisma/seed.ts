import 'dotenv/config'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@/lib/generated/prisma'

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

  // 3. Users
  const admins = [
    { name: 'Vinícius Tavares Mota', email: 'vinicius.mota@mavellium.com.br' },
    { name: 'Fábio', email: 'frgfabio@gmail.com' },
  ]

  const users = []
  for (const admin of admins) {
    const user = await prisma.user.upsert({
      where: {
        email_tenantId: {
          email: admin.email,
          tenantId: tenant.id,
        },
      },
      update: {
        passwordHash,
        role: 'admin',
      },
      create: {
        name: admin.name,
        email: admin.email,
        passwordHash,
        role: 'admin',
        tenantId: tenant.id,
        isActive: true,
        status: 'active',
      },
    })
    users.push(user)
  }

  // 4. Template EAP (matriz documental — estruturas iniciais em branco)
  await ensureEapTemplate(tenant.id)

  console.log('✅ Seed completed!')
  console.log({
    emails: users.map((u) => u.email),
    tenant: tenant.name,
  })
}

/** Garante o template EAP ativo do tenant com a estrutura padrão (SPEC §26). */
async function ensureEapTemplate(tenantId: string) {
  const { EAP_TEMPLATE_NAME, EAP_TEMPLATE_DESCRIPTION, createDefaultStructure } = await import('../lib/eapTemplate')
  const structure = createDefaultStructure()

  await prisma.eapTemplate.upsert({
    where: { id: `eap-template-${tenantId}` },
    update: {
      name: EAP_TEMPLATE_NAME,
      version: '1.0',
      description: EAP_TEMPLATE_DESCRIPTION,
      isActive: true,
    },
    create: {
      id: `eap-template-${tenantId}`,
      tenantId,
      name: EAP_TEMPLATE_NAME,
      version: '1.0',
      description: EAP_TEMPLATE_DESCRIPTION,
      isActive: true,
      structure: structure as unknown as Prisma.JsonValue,
    },
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