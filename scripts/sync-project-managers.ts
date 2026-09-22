/**
 * Backfill idempotente: garante que projetos que receberam o UserProjectRole
 * "Gerente de Projeto" tenham a função refletida na coluna UserProject.role
 * (cargos fusão visível em Stakeholders). Projetos criados ANTES da
 * sincronização do cargo ficaram com UserProjectRole órfão (sem a string).
 *
 * Esta correção apenas adiciona a string "Gerente de Projeto" ao cargo do
 * projeto onde o UserProjectRole (gerente) já existe — não mexe em nada além.
 *
 * Rode quando necessário: pnpm exec tsx scripts/sync-project-managers.ts
 */
import 'dotenv/config'
import prisma from '@/lib/prisma'

const GERENTE_LABEL = 'Gerente de Projeto'

function normalizeCargos(role: string | null | undefined): string[] {
  return (role ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
}

async function ensureGerenteCargo(userId: string, projectId: string) {
  const up = await prisma.userProject.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { role: true },
  })
  if (!up) return { userId, projectId, status: 'SEM_MEMBRO' as const }

  const cargos = normalizeCargos(up.role)
  if (cargos.some(c => c.toLowerCase() === GERENTE_LABEL.toLowerCase())) {
    return { userId, projectId, status: 'OK' as const }
  }

  await prisma.userProject.update({
    where: { userId_projectId: { userId, projectId } },
    data: { role: [...cargos, GERENTE_LABEL].join(', ') },
  })
  return { userId, projectId, status: 'CORRIGIDO' as const }
}

async function main() {
  const gerenteRoles = await prisma.userProjectRole.findMany({
    where: { deletedAt: null, role: { is: { nameKey: 'gerente', scope: 'PROJETO' } } },
    select: { userId: true, projectId: true },
  })

  console.log(`Encontrados ${gerenteRoles.length} UserProjectRole de gerente active.`)

  const resultados: { userId: string; projectId: string; status: string }[] = []
  for (const r of gerenteRoles) {
    const res = await ensureGerenteCargo(r.userId, r.projectId)
    resultados.push(res)
  }

  const corrigidos = resultados.filter(r => r.status === 'CORRIGIDO')
  if (corrigidos.length === 0) {
    console.log('Tudo já está sincronizado — nenhum cargo precisou de ajuste.')
  } else {
    console.log(`\nCargos "Gerente de Projeto" adicionados em ${corrigidos.length} projeto(s):`)
    corrigidos.slice(0, 50).forEach(c => console.log(`  - ${c.userId} @ ${c.projectId}`))
  }
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
