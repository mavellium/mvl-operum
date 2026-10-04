import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithSession } from '@/lib/clientFetch'
import ProjectCharter from '@/components/projetos/documentacao/ProjectCharter'
const { toast, members } = vi.hoisted(() => ({ toast: vi.fn(), members: [] }))
vi.mock('next/navigation', () => ({ useParams: () => ({ projetoId: 'p1' }) }))
vi.mock('react-to-print', () => ({ useReactToPrint: () => vi.fn() }))
vi.mock('@/lib/clientFetch', () => ({ fetchWithSession: vi.fn() }))
vi.mock('@/components/permissoes/ProjectPermissions', () => ({ useProjectPermissions: () => new Set(['documentos:ver', 'documentos:editar']) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }))
vi.mock('@/components/projetos/documentacao/MembroEquipeSelect', () => ({ default: () => null, useMembrosEquipe: () => ({ todos: members, registrarCriado: vi.fn() }) }))
vi.mock('@/components/projetos/documentacao/ProjectCharterDocument', () => ({ default: () => <div>Prévia do Termo</div> }))
vi.mock('@/components/projetos/documentacao/MacroFaseTable', () => ({ default: () => null }))
const published = { project: { id: 'p1', name: 'Projeto', logoUrl: null, startDate: null, justificativa: 'Vigente', objetivos: '', metodologia: '', descricaoProduto: '', premissas: '', restricoes: '', limitesAutoridade: '' }, macroFases: [], gerente: null, gerenteProjeto: '', membros: [] }
beforeEach(() => { vi.resetAllMocks() })
describe('rascunho privado do Termo', () => {
  it('não grava conteúdo inicial/vigente antes de terminar a recuperação do rascunho', async () => {
    let resolveDraft!: (response: Response) => void
    const draft = new Promise<Response>(resolve => { resolveDraft = resolve })
    vi.mocked(fetchWithSession).mockImplementation(async (url, init) => {
      if (init?.method === 'PATCH') return Response.json({ saved: true })
      if (String(url).includes('/revisions')) return draft
      if (String(url).includes('/versions')) return Response.json([])
      return Response.json(published)
    })
    render(<ProjectCharter />)
    await screen.findByText('Prévia do Termo')
    await waitFor(() => expect(fetchWithSession).toHaveBeenCalledWith('/api/projects/p1/revisions?type=CHARTER&draft=1'))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1300)) })
    expect(vi.mocked(fetchWithSession).mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(0)
    await act(async () => { resolveDraft(Response.json({ payload: { justificativa: 'Rascunho privado' } })) })
    await screen.findByDisplayValue('Rascunho privado')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1300)) })
    const writes = vi.mocked(fetchWithSession).mock.calls.filter(([, init]) => init?.method === 'PATCH')
    expect(writes.length).toBeGreaterThan(0)
    expect(writes.every(([, init]) => JSON.parse(String(init?.body)).justificativa === 'Rascunho privado')).toBe(true)
  })
  it('erro de recuperação mantém edição bloqueada e oferece nova tentativa', async () => {
    vi.mocked(fetchWithSession).mockImplementation(async url => String(url).includes('/revisions')
      ? Response.json({ error: 'Indisponível' }, { status: 503 })
      : String(url).includes('/versions') ? Response.json([]) : Response.json(published))
    render(<ProjectCharter />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível recuperar seu rascunho')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled()
    expect(screen.getByDisplayValue('Vigente')).toBeDisabled()
  })
})
