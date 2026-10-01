// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('react', async importOriginal => ({
  ...(await importOriginal<typeof import('react')>()),
  // Sem memorização entre testes.
  cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    project: { findFirst: vi.fn() },
    userProject: { findUnique: vi.fn() },
    userProjectRole: { findFirst: vi.fn() },
    role: { findMany: vi.fn() },
    userPermission: { findMany: vi.fn() },
  },
}))

import prisma from '@/lib/prisma'
import { can, exigirPermissao, permissoesNoProjeto, SemPermissaoError } from '@/services/authz'
import { PADRAO_MEMBRO, TODAS } from '@/lib/permissoes'

const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>
const perm = (k: string) => {
  const [resource, action] = k.split(':')
  return { permission: { resource, action } }
}
const funcao = (id: string, name: string, definidas: string[] | null, extra: Record<string, unknown> = {}) => ({
  id, name, nameKey: name.toLowerCase(), scope: 'TENANT',
  permissoesDefinidasEm: definidas ? new Date() : null,
  permissions: (definidas ?? []).map(perm),
  ...extra,
})
const sessao = { userId: 'u1', tenantId: 't1', role: 'member' }
const lista = (s: Set<string>) => [...s].sort()

function cenario(o: {
  projeto?: boolean
  cargos?: string | null
  ativo?: boolean
  gerenteRoleId?: string | null
  funcoes?: ReturnType<typeof funcao>[]
  ajustes?: { projectId: string | null; effect: 'GRANT' | 'DENY'; k: string }[]
}) {
  db.project.findFirst.mockResolvedValue(o.projeto === false ? null : { id: 'p1' })
  db.userProject.findUnique.mockResolvedValue(o.cargos === undefined ? null : { role: o.cargos, active: o.ativo ?? true })
  db.userProjectRole.findFirst.mockResolvedValue(o.gerenteRoleId ? { roleId: o.gerenteRoleId } : null)
  db.role.findMany.mockResolvedValue(o.funcoes ?? [])
  db.userPermission.findMany.mockResolvedValue((o.ajustes ?? []).map(a => ({ projectId: a.projectId, effect: a.effect, ...perm(a.k) })))
}

beforeEach(() => vi.clearAllMocks())

describe('permissoesNoProjeto (SDD 5.1)', () => {
  it('admin: todas apenas para projeto da instituição atual', async () => {
    cenario({ projeto: true })
    const r = await permissoesNoProjeto('u1', 't1', 'admin', 'p1')
    expect(lista(r)).toEqual([...TODAS].sort())
    expect(db.project.findFirst).toHaveBeenCalledWith({ where: { id: 'p1', tenantId: 't1', deletedAt: null }, select: { id: true } })
    expect(db.role.findMany).not.toHaveBeenCalled()
  })

  it('admin não recebe permissões para projeto excluído, inexistente ou de outro tenant', async () => {
    cenario({ projeto: false })
    expect((await permissoesNoProjeto('u1', 't1', 'admin', 'p1')).size).toBe(0)
  })

  it('não é membro do projeto: nada', async () => {
    cenario({ cargos: undefined })
    expect((await permissoesNoProjeto('u1', 't1', 'member', 'p1')).size).toBe(0)
  })

  it('membro inativo ou projeto de outro tenant: nada', async () => {
    cenario({ cargos: 'Dev', ativo: false })
    expect((await permissoesNoProjeto('u1', 't1', 'member', 'p1')).size).toBe(0)
    cenario({ cargos: 'Dev', projeto: false })
    expect((await permissoesNoProjeto('u1', 't1', 'member', 'p1')).size).toBe(0)
  })

  it('membro sem função configurada: padrão do membro', async () => {
    cenario({ cargos: 'Dev', funcoes: [funcao('r-dev', 'Dev', null)] })
    expect(lista(await permissoesNoProjeto('u1', 't1', 'member', 'p1'))).toEqual([...PADRAO_MEMBRO].sort())
  })

  it('cargo casa com a função pela funcaoKey (plural, acento, maiúsculas)', async () => {
    cenario({
      cargos: 'TECH LEADS',
      funcoes: [funcao('r-tl', 'Tech Lead', ['quadro:sprints', 'planilha:realizado-todos'])],
    })
    const r = await permissoesNoProjeto('u1', 't1', 'member', 'p1')
    expect(r.has('quadro:sprints')).toBe(true)
    expect(r.has('planilha:realizado-todos')).toBe(true)
  })

  it('gerente pelo papel (UserProjectRole), sem configuração: tudo', async () => {
    cenario({
      cargos: 'Dev',
      gerenteRoleId: 'r-ger',
      funcoes: [funcao('r-ger', 'Gerente de Projeto', null, { nameKey: 'gerente', scope: 'PROJETO' })],
    })
    expect(lista(await permissoesNoProjeto('u1', 't1', 'member', 'p1'))).toEqual([...TODAS].sort())
  })

  it('a função-base "Membro do projeto" configurada substitui o padrão do membro', async () => {
    cenario({
      cargos: '',
      funcoes: [funcao('r-base', 'Membro do projeto', ['projeto:ver'], { nameKey: 'membro-base', scope: 'PROJETO' })],
    })
    expect(lista(await permissoesNoProjeto('u1', 't1', 'member', 'p1'))).toEqual(['projeto:ver'])
  })

  it('a base não é tratada como cargo, mesmo com o nome igual', async () => {
    cenario({
      cargos: 'Membro do projeto',
      funcoes: [funcao('r-base', 'Membro do projeto', [], { nameKey: 'membro-base', scope: 'PROJETO' })],
    })
    expect((await permissoesNoProjeto('u1', 't1', 'member', 'p1')).size).toBe(0)
  })

  it('ajustes do usuário: global e do projeto, o do projeto vence', async () => {
    cenario({
      cargos: 'Dev',
      ajustes: [
        { projectId: null, effect: 'GRANT', k: 'planilha:orcado' },
        { projectId: null, effect: 'DENY', k: 'quadro:mover' },
        { projectId: 'p1', effect: 'GRANT', k: 'quadro:mover' },
        { projectId: 'p1', effect: 'DENY', k: 'documentos:editar' },
      ],
    })
    const r = await permissoesNoProjeto('u1', 't1', 'member', 'p1')
    expect(r.has('planilha:orcado')).toBe(true)
    expect(r.has('quadro:mover')).toBe(true)
    expect(r.has('documentos:editar')).toBe(false)
  })

  it('permissão desconhecida vinda do banco é ignorada', async () => {
    cenario({ cargos: 'X', funcoes: [funcao('r-x', 'X', ['projeto:ver', 'foo:bar'])] })
    expect((await permissoesNoProjeto('u1', 't1', 'member', 'p1')).has('foo:bar' as never)).toBe(false)
  })
})

describe('can / exigirPermissao', () => {
  it('can responde pela permissão pedida', async () => {
    cenario({ cargos: 'Dev' })
    expect(await can(sessao, 'p1', 'documentos:editar')).toBe(true)
    expect(await can(sessao, 'p1', 'documentos:aprovar')).toBe(false)
  })

  it('exigirPermissao lança com mensagem legível', async () => {
    cenario({ cargos: 'Dev' })
    await expect(exigirPermissao(sessao, 'p1', 'documentos:aprovar')).rejects.toThrow(SemPermissaoError)
    await expect(exigirPermissao(sessao, 'p1', 'documentos:aprovar')).rejects.toThrow('Sem permissão: aprovar ou rejeitar versões.')
  })
})
