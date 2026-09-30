// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/services/auditoriaService', () => ({ registrarAcao: vi.fn() }))
vi.mock('@/services/authz', () => ({ permissoesNoProjeto: vi.fn() }))
vi.mock('@/services/permissoesService', () => ({
  listarFuncoesComPermissoes: vi.fn().mockResolvedValue([]),
  salvarPermissoesDaFuncao: vi.fn().mockResolvedValue({ id: 'cr0le000000000000000000001', name: 'Tech Lead' }),
  restaurarPadraoDaFuncao: vi.fn().mockResolvedValue({ id: 'cr0le000000000000000000001', name: 'Tech Lead' }),
  listarAjustesDoUsuario: vi.fn().mockResolvedValue({ herdadas: null, ajustes: {} }),
  salvarAjusteDoUsuario: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { registrarAcao } from '@/services/auditoriaService'
import { permissoesNoProjeto } from '@/services/authz'
import { salvarAjusteDoUsuario, salvarPermissoesDaFuncao } from '@/services/permissoesService'
import {
  minhasPermissoesAction,
  salvarAjusteUsuarioAction,
  salvarPermissoesFuncaoAction,
} from '@/app/actions/permissoes'

const ROLE = 'cr0le000000000000000000001'
const USER = 'cus3r000000000000000000001'
const PROJ = 'cpr0j000000000000000000001'
const admin = { userId: 'cadm1n00000000000000000001', tenantId: 't1', role: 'admin' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue(admin as never)
})

describe('actions de permissões (SDD 5.1)', () => {
  it('só o admin altera: gerente recebe erro e nada é gravado', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...admin, role: 'member' } as never)
    expect(await salvarPermissoesFuncaoAction({ roleId: ROLE, permissoes: ['projeto:ver'] })).toEqual({
      error: 'Apenas o administrador pode alterar permissões.',
    })
    expect(await salvarAjusteUsuarioAction({ userId: USER, projectId: null, permissao: 'projeto:ver', efeito: 'GRANT' })).toEqual({
      error: 'Apenas o administrador pode alterar permissões.',
    })
    expect(salvarPermissoesDaFuncao).not.toHaveBeenCalled()
    expect(salvarAjusteDoUsuario).not.toHaveBeenCalled()
  })

  it('salva a função sem repetir permissões e audita', async () => {
    const r = await salvarPermissoesFuncaoAction({ roleId: ROLE, permissoes: ['quadro:sprints', 'quadro:sprints', 'planilha:realizado-todos'] })
    expect(r).toMatchObject({ success: true })
    expect(salvarPermissoesDaFuncao).toHaveBeenCalledWith('t1', ROLE, ['quadro:sprints', 'planilha:realizado-todos'])
    expect(registrarAcao).toHaveBeenCalledWith(expect.objectContaining({ action: 'PERMISSOES_FUNCAO', entityId: ROLE }))
  })

  it('recusa permissão desconhecida', async () => {
    const r = await salvarPermissoesFuncaoAction({ roleId: ROLE, permissoes: ['tudo:tudo'] })
    expect(r).toHaveProperty('error')
    expect(salvarPermissoesDaFuncao).not.toHaveBeenCalled()
  })

  it('ajuste por usuário no projeto: grava e audita com o efeito (null = herdar)', async () => {
    const r = await salvarAjusteUsuarioAction({ userId: USER, projectId: PROJ, permissao: 'documentos:aprovar', efeito: null })
    expect(r).toEqual({ success: true })
    expect(salvarAjusteDoUsuario).toHaveBeenCalledWith('t1', USER, PROJ, 'documentos:aprovar', null)
    expect(registrarAcao).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PERMISSAO_USUARIO', details: { projeto: PROJ, permissao: 'documentos:aprovar', efeito: 'HERDAR' },
    }))
  })

  it('minhasPermissoesAction devolve as permissões do usuário logado', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...admin, role: 'member' } as never)
    vi.mocked(permissoesNoProjeto).mockResolvedValue(new Set(['projeto:ver', 'quadro:ver']) as never)
    expect(await minhasPermissoesAction(PROJ)).toEqual(['projeto:ver', 'quadro:ver'])
    expect(await minhasPermissoesAction('../x')).toEqual([])
  })
})
