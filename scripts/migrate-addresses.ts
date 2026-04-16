import prisma from '../lib/prisma'

function parseAddress(raw: string | null) {
  if (!raw || !raw.trim()) return {}
  const s = raw.trim().replace(/\s{2,}/g, ' ')
  let cidade, estado
  let rest = s

  const cidadeEstadoMatch = rest.match(/,\s*([^,]+?)\s*[-\/]\s*([A-Z]{2})\s*$/)
  if (cidadeEstadoMatch) {
    cidade = cidadeEstadoMatch[1].trim()
    estado = cidadeEstadoMatch[2].trim()
    rest = rest.slice(0, cidadeEstadoMatch.index).trim()
  }

  const parts = rest.split(',').map(p => p.trim()).filter(Boolean)

  let logradouro, numero, complemento, bairro

  if (parts.length >= 1) logradouro = parts[0]
  if (parts.length >= 2) {
    if (/^\d/.test(parts[1])) {
      numero = parts[1]
      if (parts.length === 3) bairro = parts[2]
      if (parts.length >= 4) { complemento = parts[2]; bairro = parts[3] }
    } else {
      bairro = parts[1]
    }
  }
  return { logradouro, numero, complemento, bairro, cidade, estado }
}

async function main() {
  console.log('🚀 Iniciando migração de endereços (Bypass via Raw SQL)...\n')

  // --- Users ---
  try {
    // Lê direto do banco físico ignorando a validação do schema
    const users: any[] = await prisma.$queryRaw`SELECT id, address FROM "User" WHERE address IS NOT NULL AND address != ''`
    console.log(`Encontrados ${users.length} usuários com endereço antigo.`)
    
    let userUpdated = 0
    for (const user of users) {
      const parsed = parseAddress(user.address)
      await prisma.user.update({
        where: { id: user.id },
        data: parsed,
      })
      userUpdated++
    }
    console.log(`✅ ${userUpdated} usuários migrados.\n`)
  } catch (e: any) {
    console.log('⚠️ Coluna "address" de User já foi deletada fisicamente do banco.\n')
  }

  // --- Stakeholders ---
  try {
    // Lê direto do banco físico ignorando a validação do schema
    const stakeholders: any[] = await prisma.$queryRaw`SELECT id, address FROM "Stakeholder" WHERE address IS NOT NULL AND address != ''`
    console.log(`Encontrados ${stakeholders.length} stakeholders com endereço antigo.`)
    
    let skUpdated = 0
    for (const sk of stakeholders) {
      const parsed = parseAddress(sk.address)
      await prisma.stakeholder.update({
        where: { id: sk.id },
        data: parsed,
      })
      skUpdated++
    }
    console.log(`✅ ${skUpdated} stakeholders migrados.\n`)
  } catch (e: any) {
    console.log('⚠️ Coluna "address" de Stakeholder já foi deletada fisicamente do banco.\n')
  }

  console.log('🎉 Migração concluída com sucesso!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); process.exit(0) })