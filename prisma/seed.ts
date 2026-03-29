import prisma from '../lib/prisma'

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: 'motavin140@gmail.com' },
    data: { role: 'admin' },
  })
  console.log(`Updated ${result.count} user(s) to admin`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
