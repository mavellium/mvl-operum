import 'server-only'
import prisma from '@/lib/prisma'
import { funcaoKey } from '@/lib/utils/normalize'
import {
  BASE_MEMBRO_KEY,
  BASE_MEMBRO_NOME,
  PADRAO_MEMBRO,
  TODAS,
  isPermissao,
  padraoDaFuncao,
  resolverPermissoes,
  type Permissao,
} from '@/lib/permissoes'
import { entradaDoUsuario } from '@/services/authz'

/** Função como aparece na tela de permissões (SDD 5.1). */
export interface FuncaoComPermissoes {
  /** null = a função-base "Membro do projeto" ainda não foi criada no tenant. */
  id: string | null
  nome: string
  tipo: 'base' | 'gerente' | 'funcao'
  /** Quando o admin salvou; null = usando o padrão. */
  definidasEm: string | null
  /** Efetivas: as definidas pelo admin ou, sem elas, o padrão da função. */
  permissoes: Permissao[]
}

type LinhaPermissao = { permission: { resource: string; action: string } }

function chaves(linhas: LinhaPermissao[]): Permissao[] {
  return linhas.map(l => `${l.permission.resource}:${l.permission.action}`).filter(isPermissao)
}

function ehGerente(f: { nameKey: string; scope: string }) {
  return f.nameKey === 'gerente' && f.scope === 'PROJETO'
}

export async function listarFuncoesComPermissoes(tenantId: string): Promise<FuncaoComPermissoes[]> {
  const funcoes = await prisma.role.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      nameKey: true,
      scope: true,
      permissoesDefinidasEm: true,
      permissions: { select: { permission: { select: { resource: true, action: true } } } },
    },
  })
  const base = funcoes.find(f => f.nameKey === BASE_MEMBRO_KEY && f.scope === 'PROJETO')

  const itemBase: FuncaoComPermissoes = {
    id: base?.id ?? null,
    nome: BASE_MEMBRO_NOME,
    tipo: 'base',
    definidasEm: base?.permissoesDefinidasEm?.toISOString() ?? null,
    permissoes: base?.permissoesDefinidasEm ? chaves(base.permissions) : [...PADRAO_MEMBRO],
  }

  const demais = funcoes
    .filter(f => f !== base)
    .map<FuncaoComPermissoes>(f => ({
      id: f.id,
      nome: f.name,
      tipo: ehGerente(f) ? 'gerente' : 'funcao',
      definidasEm: f.permissoesDefinidasEm?.toISOString() ?? null,
      permissoes: f.permissoesDefinidasEm
        ? chaves(f.permissions)
        : [...(ehGerente(f) ? TODAS : padraoDaFuncao(funcaoKey(f.name)))],
    }))
    // Gerente primeiro; o resto em ordem alfabética.
    .sort((a, b) => Number(b.tipo === 'gerente') - Number(a.tipo === 'gerente') || a.nome.localeCompare(b.nome, 'pt-BR'))

  return [itemBase, ...demais]
}

async function idsDoCatalogo(): Promise<Map<Permissao, string>> {
  const linhas = await prisma.permission.findMany({
    where: { deletedAt: null },
    select: { id: true, resource: true, action: true },
  })
  const mapa = new Map<Permissao, string>()
  for (const l of linhas) {
    const k = `${l.resource}:${l.action}`
    if (isPermissao(k)) mapa.set(k, l.id)
  }
  return mapa
}

async function idDaPermissao(permissao: Permissao): Promise<string> {
  const id = (await idsDoCatalogo()).get(permissao)
  if (!id) throw new Error('Catálogo de permissões ausente no banco. A migration de permissões foi aplicada?')
  return id
}

/** Salva as permissões de uma função (roleId null = cria/usa a função-base do membro). */
export async function salvarPermissoesDaFuncao(tenantId: string, roleId: string | null, permissoes: Permissao[]) {
  const catalogo = await idsDoCatalogo()
  const ids = permissoes.map(p => {
    const id = catalogo.get(p)
    if (!id) throw new Error('Catálogo de permissões ausente no banco. A migration de permissões foi aplicada?')
    return id
  })

  const role = roleId
    ? await prisma.role.findFirst({ where: { id: roleId, tenantId, deletedAt: null }, select: { id: true, name: true } })
    : await prisma.role.upsert({
        where: { nameKey_tenantId_scope: { nameKey: BASE_MEMBRO_KEY, tenantId, scope: 'PROJETO' } },
        create: { tenantId, name: BASE_MEMBRO_NOME, nameKey: BASE_MEMBRO_KEY, scope: 'PROJETO' },
        update: { deletedAt: null },
        select: { id: true, name: true },
      })
  if (!role) throw new Error('Função não encontrada.')

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({ data: ids.map(permissionId => ({ roleId: role.id, permissionId })) }),
    prisma.role.update({ where: { id: role.id }, data: { permissoesDefinidasEm: new Date() } }),
  ])
  return role
}

/** Volta a função ao padrão: apaga as permissões definidas e a marca de "definidas". */
export async function restaurarPadraoDaFuncao(tenantId: string, roleId: string) {
  const role = await prisma.role.findFirst({ where: { id: roleId, tenantId, deletedAt: null }, select: { id: true, name: true } })
  if (!role) throw new Error('Função não encontrada.')
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.role.update({ where: { id: role.id }, data: { permissoesDefinidasEm: null } }),
  ])
  return role
}

export type EfeitoAjuste = 'GRANT' | 'DENY'

export interface AjustesDoUsuario {
  /** O que a pessoa teria sem os ajustes deste escopo. null no escopo global (varia por projeto). */
  herdadas: Permissao[] | null
  ajustes: Partial<Record<Permissao, EfeitoAjuste>>
}

export async function listarAjustesDoUsuario(
  tenantId: string,
  userId: string,
  projectId: string | null,
): Promise<AjustesDoUsuario> {
  const usuario = await prisma.user.findFirst({ where: { id: userId, tenantId, deletedAt: null }, select: { id: true } })
  if (!usuario) throw new Error('Usuário não encontrado.')
  if (projectId) {
    const projeto = await prisma.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null }, select: { id: true } })
    if (!projeto) throw new Error('Projeto não encontrado.')
  }

  const linhas = await prisma.userPermission.findMany({
    where: { userId, projectId },
    select: { effect: true, permission: { select: { resource: true, action: true } } },
  })
  const ajustes: AjustesDoUsuario['ajustes'] = {}
  for (const l of linhas) {
    const k = `${l.permission.resource}:${l.permission.action}`
    if (isPermissao(k)) ajustes[k] = l.effect
  }

  let herdadas: Permissao[] | null = null
  if (projectId) {
    const entrada = await entradaDoUsuario(userId, tenantId, projectId)
    herdadas = [...resolverPermissoes({ ...entrada, ajustesProjeto: [] })]
  }
  return { herdadas, ajustes }
}

/** GRANT/DENY grava o ajuste; null apaga (volta a herdar). */
export async function salvarAjusteDoUsuario(
  tenantId: string,
  userId: string,
  projectId: string | null,
  permissao: Permissao,
  efeito: EfeitoAjuste | null,
) {
  const usuario = await prisma.user.findFirst({ where: { id: userId, tenantId, deletedAt: null }, select: { id: true } })
  if (!usuario) throw new Error('Usuário não encontrado.')
  if (projectId) {
    const projeto = await prisma.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null }, select: { id: true } })
    if (!projeto) throw new Error('Projeto não encontrado.')
  }
  const permissionId = await idDaPermissao(permissao)

  if (efeito === null) {
    await prisma.userPermission.deleteMany({ where: { userId, projectId, permissionId } })
    return
  }
  const existente = await prisma.userPermission.findFirst({ where: { userId, projectId, permissionId }, select: { id: true } })
  if (existente) {
    await prisma.userPermission.update({ where: { id: existente.id }, data: { effect: efeito } })
  } else {
    await prisma.userPermission.create({ data: { userId, projectId, permissionId, effect: efeito } })
  }
}
