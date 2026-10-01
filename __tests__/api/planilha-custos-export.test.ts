// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('@/services/authz', async original => ({ ...(await original<typeof import('@/services/authz')>()), exigirPermissao: vi.fn() }))
vi.mock('@/services/projectService', () => ({ findById: vi.fn() }))
vi.mock('@/services/wbsService', () => ({ getTree: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ default: { userProject: { findMany: vi.fn() } } }))
vi.mock('@/lib/planilhaCustos', () => ({ computarPlanilhaCustos: vi.fn() }))
vi.mock('@/lib/exports/planilhaCustosXlsx', () => ({ gerarPlanilhaXlsx: vi.fn() }))
vi.mock('server-only', () => ({}))
import { verifySession } from '@/lib/dal'
import { exigirPermissao, SemPermissaoError } from '@/services/authz'
import { findById } from '@/services/projectService'
import { getTree } from '@/services/wbsService'
import { gerarPlanilhaXlsx } from '@/lib/exports/planilhaCustosXlsx'
import prisma from '@/lib/prisma'
import { GET } from '@/app/api/projetos/[projetoId]/planilha-custos/export/route'
const session = { userId: 'u1', tenantId: 't1', role: 'member' }
const request = () => GET(new Request('http://localhost/api/projetos/p1/planilha-custos/export'), { params: Promise.resolve({ projetoId: 'p1' }) })
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(verifySession).mockResolvedValue(session as never)
  vi.mocked(findById).mockResolvedValue({ name: 'Projeto', valorReferencia: 4000, horasPorDia: 8 } as never)
  vi.mocked(prisma.userProject.findMany).mockResolvedValue([])
  vi.mocked(getTree).mockResolvedValue({ nodes: {}, rootId: null, serverVersion: 0 })
  vi.mocked(gerarPlanilhaXlsx).mockResolvedValue(Buffer.from('xlsx'))
})
describe('Exportação da planilha respeita permissões de leitura', () => {
  it.each(['projeto:ver', 'planilha:ver'] as const)('recusa sem %s antes de carregar dados ou gerar arquivo', async permission => {
    vi.mocked(exigirPermissao).mockImplementation(async (_s, _p, key) => { if (key === permission) throw new SemPermissaoError(permission) })
    expect((await request()).status).toBe(403)
    expect(findById).not.toHaveBeenCalled()
    expect(getTree).not.toHaveBeenCalled()
    expect(gerarPlanilhaXlsx).not.toHaveBeenCalled()
  })
  it('com leitura permite exportar sem exigir edição', async () => {
    const response = await request()
    expect(response.status).toBe(200)
    expect(exigirPermissao).toHaveBeenCalledWith(session, 'p1', 'projeto:ver')
    expect(exigirPermissao).toHaveBeenCalledWith(session, 'p1', 'planilha:ver')
    expect(exigirPermissao).toHaveBeenCalledTimes(2)
    expect(getTree).toHaveBeenCalledWith('p1', 't1')
    expect(response.headers.get('Content-Disposition')).toContain('Planilha_de_Custos_Projeto.xlsx')
  })
})
