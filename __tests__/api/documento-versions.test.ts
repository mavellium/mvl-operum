// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('@/services/projectAccess', () => ({ canProjectPermission: vi.fn(), requireProjectPermission: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ default: { documentVersion: { findMany: vi.fn() } } }))
vi.mock('@/services/documentRevisionService', () => ({ submeterDocumento: vi.fn(), revisarDocumento: vi.fn() }))
import { verifySession } from '@/lib/dal'
import { requireProjectPermission, canProjectPermission } from '@/services/projectAccess'
import { SemPermissaoError } from '@/services/authz'
import prisma from '@/lib/prisma'
import { submeterDocumento, revisarDocumento } from '@/services/documentRevisionService'
import { GET, POST } from '@/app/api/projects/[projetoId]/documento/versions/route'
import { PATCH } from '@/app/api/projects/[projetoId]/documento/versions/[versionId]/route'
const session = { tenantId: 't1', userId: 'u1', role: 'member' }
const params = Promise.resolve({ projetoId: 'p1' })
const body = { commitTitle: 'Contato atualizado', versao: '2', elaboradoPor: 'Pessoa', aprovadoPor: '', dataAprovacao: '', payload: { header: {}, stakeholders: [] } }
const request = (data: unknown, method = 'POST') => new Request('http://localhost/api/projects/p1/documento/versions', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(verifySession).mockResolvedValue(session as never)
  vi.mocked(canProjectPermission).mockResolvedValue(false)
  vi.mocked(prisma.documentVersion.findMany).mockResolvedValue([])
})
describe('adaptadores de versões documentais', () => {
  it('envia o snapshot inteiro ao serviço com autor da sessão', async () => {
    vi.mocked(submeterDocumento).mockResolvedValue({ id: 'v1', status: 'PENDING' } as never)
    const response = await POST(request({ ...body, authorId: 'forjado', status: 'APPROVED' }), { params })
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ status: 'PENDING' })
    expect(submeterDocumento).toHaveBeenCalledWith(session, 'p1', 'STAKEHOLDER', body.payload, { commitTitle: body.commitTitle, versao: '2', elaboradoPor: 'Pessoa', aprovadoPor: '', dataAprovacao: '' })
  })
  it('não exige data/aprovador preenchidos para uma proposta pendente', async () => {
    vi.mocked(submeterDocumento).mockResolvedValue({ id: 'v1', status: 'PENDING' } as never)
    expect((await POST(request(body), { params })).status).toBe(201)
  })
  it('recusa título ou versão ausentes', async () => {
    expect((await POST(request({ payload: {} }), { params })).status).toBe(400)
    expect(submeterDocumento).not.toHaveBeenCalled()
  })
  it('nega submissão quando o serviço recusa editar', async () => {
    vi.mocked(submeterDocumento).mockRejectedValue(new SemPermissaoError('documentos:editar'))
    expect((await POST(request(body), { params })).status).toBe(403)
  })
  it('escopa a consulta por projeto e tipo e pesquisa título ou autor', async () => {
    expect((await GET(new Request('http://localhost/api/projects/p1/documento/versions?search=Contato'), { params })).status).toBe(200)
    expect(requireProjectPermission).toHaveBeenCalledWith(session, 'p1', 'documentos:ver')
    expect(prisma.documentVersion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ projectId: 'p1', documentType: 'STAKEHOLDER', resourceId: '', OR: expect.any(Array) }) }))
  })
  it('nega leitura antes de consultar conteúdo', async () => {
    vi.mocked(requireProjectPermission).mockRejectedValue(new SemPermissaoError('documentos:ver'))
    expect((await GET(new Request('http://localhost/api/projects/p1/documento/versions'), { params })).status).toBe(403)
    expect(prisma.documentVersion.findMany).not.toHaveBeenCalled()
  })
  it('informa a permissão de aprovação no header, sem depender do papel JWT', async () => {
    vi.mocked(canProjectPermission).mockResolvedValue(true)
    const response = await GET(new Request('http://localhost/api/projects/p1/documento/versions'), { params })
    expect(response.headers.get('x-is-manager')).toBe('true')
  })
  it('aprovação passa projeto/versão ao serviço unificado', async () => {
    vi.mocked(revisarDocumento).mockResolvedValue({ id: 'v1', status: 'APPROVED' } as never)
    const response = await PATCH(request({ action: 'approve' }, 'PATCH'), { params: Promise.resolve({ projetoId: 'p1', versionId: 'v1' }) })
    expect(response.status).toBe(200)
    expect(revisarDocumento).toHaveBeenCalledWith(session, 'p1', 'v1', 'approve')
  })
  it('recusa revisão sem permissão e ação inválida', async () => {
    vi.mocked(revisarDocumento).mockRejectedValue(new SemPermissaoError('documentos:aprovar'))
    const context = { params: Promise.resolve({ projetoId: 'p1', versionId: 'v1' }) }
    expect((await PATCH(request({ action: 'reject' }, 'PATCH'), context)).status).toBe(403)
    expect((await PATCH(request({ action: 'invalid' }, 'PATCH'), context)).status).toBe(400)
  })
})
