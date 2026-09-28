/**
 * Funde funções (Role) equivalentes do mesmo tenant — ex.: "Gerente de Projeto"
 * (papel RBAC, escopo PROJETO) e "Gerente de Projetos" (criada no cadastro,
 * escopo TENANT). A equivalência usa `funcaoKey` (acento, caixa e plural).
 *
 * Para cada grupo, mantém a vencedora (papel RBAC do gerente, senão a mais
 * antiga) e, nas duplicadas:
 *   - repassa UserProjectRole.roleId para a vencedora;
 *   - move as associações ProjetoFuncao (descarta as que já existem);
 *   - copia as RolePermission que faltarem na vencedora;
 *   - troca o nome da duplicada pelo da vencedora nos cargos UserProject.role;
 *   - aplica soft delete (deletedAt).
 *
 * Idempotente. Por padrão só mostra o plano (dry-run):
 *   pnpm exec tsx scripts/dedupe-funcoes.ts
 *   pnpm exec tsx scripts/dedupe-funcoes.ts --apply
 */
import 'dotenv/config'
import prisma from '@/lib/prisma'
import { planejarDeduplicacao, type GrupoDuplicado } from '@/lib/funcoesDedupe'
import { funcaoKey } from '@/lib/utils/normalize'

const APPLY = process.argv.includes('--apply')

function splitCargos(role: string | null): string[] {
  return (role ?? '').split(',').map(s => s.trim()).filter(Boolean)
}

async function fundirGrupo(tenantId: string, grupo: GrupoDuplicado) {
  const keeperId = grupo.vencedora.id
  const dupIds = grupo.duplicadas.map(d => d.id)

  await prisma.$transaction(async tx => {
    await tx.userProjectRole.updateMany({ where: { roleId: { in: dupIds } }, data: { roleId: keeperId } })

    const assocKeeper = new Set(
      (await tx.projetoFuncao.findMany({ where: { funcaoId: keeperId }, select: { projetoId: true } })).map(a => a.projetoId),
    )
    for (const a of await tx.projetoFuncao.findMany({ where: { funcaoId: { in: dupIds } } })) {
      if (assocKeeper.has(a.projetoId)) {
        await tx.projetoFuncao.delete({ where: { id: a.id } })
      } else {
        await tx.projetoFuncao.update({ where: { id: a.id }, data: { funcaoId: keeperId } })
        assocKeeper.add(a.projetoId)
      }
    }

    const permsKeeper = new Set(
      (await tx.rolePermission.findMany({ where: { roleId: keeperId }, select: { permissionId: true } })).map(p => p.permissionId),
    )
    for (const p of await tx.rolePermission.findMany({ where: { roleId: { in: dupIds } } })) {
      if (!permsKeeper.has(p.permissionId)) {
        await tx.rolePermission.create({ data: { roleId: keeperId, permissionId: p.permissionId } })
        permsKeeper.add(p.permissionId)
      }
    }

    // Cargos em texto livre (UserProject.role) exibidos em Stakeholders/Documentos.
    const membros = await tx.userProject.findMany({
      where: { project: { tenantId }, role: { not: null } },
      select: { userId: true, projectId: true, role: true },
    })
    for (const m of membros) {
      const cargos = splitCargos(m.role)
      const novos: string[] = []
      for (const c of cargos) {
        const nome = funcaoKey(c) === grupo.chave ? grupo.vencedora.name : c
        if (!novos.some(n => funcaoKey(n) === funcaoKey(nome))) novos.push(nome)
      }
      if (novos.join(', ') !== cargos.join(', ')) {
        await tx.userProject.update({
          where: { userId_projectId: { userId: m.userId, projectId: m.projectId } },
          data: { role: novos.join(', ') },
        })
      }
    }

    await tx.role.updateMany({ where: { id: { in: dupIds } }, data: { deletedAt: new Date() } })
  })
}

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } })
  let total = 0

  for (const t of tenants) {
    const funcoes = await prisma.role.findMany({
      where: { tenantId: t.id, deletedAt: null },
      select: { id: true, name: true, nameKey: true, scope: true, createdAt: true },
    })
    const grupos = planejarDeduplicacao(funcoes)
    if (grupos.length === 0) continue

    console.log(`\nTenant ${t.name} (${t.id})`)
    for (const g of grupos) {
      total += g.duplicadas.length
      console.log(`  manter  "${g.vencedora.name}" [${g.vencedora.scope}] ${g.vencedora.id}`)
      for (const d of g.duplicadas) console.log(`  fundir  "${d.name}" [${d.scope}] ${d.id}`)
      if (APPLY) await fundirGrupo(t.id, g)
    }
  }

  if (total === 0) console.log('Nenhuma função duplicada encontrada.')
  else if (APPLY) console.log(`\n${total} função(ões) fundida(s).`)
  else console.log(`\n${total} função(ões) seriam fundidas. Rode com --apply para gravar.`)
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
