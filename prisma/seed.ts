import 'dotenv/config'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Iniciando seed...')

  // Verificação de segurança para a senha do banco
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não encontrada no .env')
  }

  // 1. Tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdominio: 'mavellium' },
    update: {},
    create: {
      nome: 'MVL Operum',
      subdominio: 'mavellium',
      status: 'ATIVO',
    },
  })

  // 2. Senha
  const password = 'senha123'
  const passwordHash = await bcrypt.hash(password, 10)

  // 3. Usuário (Tudo dentro do main)
  const user = await prisma.user.upsert({
    where: { 
      email_tenantId: { 
        email: 'vinicius.mota@mavellium.com.br', 
        tenantId: tenant.id 
      } 
    },
    update: {
      passwordHash,
      role: 'admin'
    },
    create: {
      name: 'Vinícius Tavares Mota',
      email: 'vinicius.mota@mavellium.com.br',
      passwordHash,
      role: 'admin',
      tenantId: tenant.id,
      isActive: true,
      status: 'ativo',
    },
  })

  console.log('✅ Seed completo!')
  console.log({ email: user.email, tenant: tenant.nome })
}

// Execução segura sem await solto
main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })