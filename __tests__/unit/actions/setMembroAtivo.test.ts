// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ projectsApi: { setMemberSituacao: vi.fn() } }))
vi.mock('@/lib/prisma', () => ({ default: { user: { findUnique: vi.fn() } } }))
vi.mock('@/services/projectRoleService', () => ({
  setProjectManagerRole: vi.fn(), removeProjectRole: vi.fn(), isProjectManager: vi.fn(),
}))
vi.mock('@/services/membroInativo', () => ({ notificarPendenciasDoMembroInativo: vi.fn() }))
vi.mock('@/services/projectAccess', () => ({ requireProjectPermission: vi.fn() }))
vi.mock('@/services/wbsService', () => ({ getTree: vi.fn() }))
vi.mock('@/services/macroFaseSyncService', () => ({ reconcileMacroFases: vi.fn() }))

import { verifySession } from '@/lib/dal'
import { projectsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'
import { notificarPendenciasDoMembroInativo } from '@/services/membroInativo'
import { requireProjectPermission } from '@/services/projectAccess'
import { setMembroAtivoAction } from '@/app/actions/projetos'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ userId: 'gerente', tenantId: 't1', role: 'member' } as never)
  vi.mocked(isProjectManager).mockResolvedValue(false)
  vi.mocked(projectsApi.setMemberSituacao).mockResolvedValue({} as never)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', name: 'Ana' } as never)
  vi.mocked(notificarPendenciasDoMembroInativo).mockResolvedValue({ gerentes: 1, pendentes: 3 })
})

describe('setMembroAtivoAction', () => {
  it('exige projeto:equipe, inativa com motivo e avisa os gerentes', async () => {
    const r = await setMembroAtivoAction('p1', 'u1', false, '  Saiu da equipe ')
    expect(requireProjectPermission).toHaveBeenCalledWith(expect.anything(), 'p1', 'projeto:equipe')
    expect(projectsApi.setMemberSituacao).toHaveBeenCalledWith('p1', 'u1', false, 'Saiu da equipe')
    expect(notificarPendenciasDoMembroInativo).toHaveBeenCalledWith('p1', { id: 'u1', name: 'Ana' }, 'Saiu da equipe')
    expect(r).toEqual({ success: true, pendentes: 3 })
  })

  it('recusa sem motivo, a si mesmo e o gerente do projeto, sem gravar', async () => {
    expect(await setMembroAtivoAction('p1', 'u1', false, 'a')).toEqual({ error: 'Informe o motivo da inativação.' })
    expect(await setMembroAtivoAction('p1', 'gerente', false, 'Saiu da equipe')).toEqual({ error: 'Você não pode inativar a si mesmo.' })
    vi.mocked(isProjectManager).mockResolvedValue(true)
    expect(await setMembroAtivoAction('p1', 'u1', false, 'Saiu da equipe')).toMatchObject({ error: expect.stringContaining('gerente do projeto') })
    expect(projectsApi.setMemberSituacao).not.toHaveBeenCalled()
  })

  it('reativar não pede motivo nem notifica', async () => {
    const r = await setMembroAtivoAction('p1', 'u1', true)
    expect(projectsApi.setMemberSituacao).toHaveBeenCalledWith('p1', 'u1', true, undefined)
    expect(notificarPendenciasDoMembroInativo).not.toHaveBeenCalled()
    expect(r).toEqual({ success: true, pendentes: 0 })
  })

  it('falha ao notificar não desfaz a inativação', async () => {
    vi.mocked(notificarPendenciasDoMembroInativo).mockRejectedValue(new Error('fila fora'))
    expect(await setMembroAtivoAction('p1', 'u1', false, 'Saiu da equipe')).toEqual({ success: true, pendentes: 0 })
  })

  it('sem permissão devolve o erro', async () => {
    vi.mocked(requireProjectPermission).mockRejectedValue(new Error('Sem permissão'))
    expect(await setMembroAtivoAction('p1', 'u1', false, 'Saiu da equipe')).toEqual({ error: 'Sem permissão' })
    expect(projectsApi.setMemberSituacao).not.toHaveBeenCalled()
  })
})
