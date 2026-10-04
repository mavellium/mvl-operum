import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { fetchWithSession } from '@/lib/clientFetch'
import HistoricoDocumento from '@/components/projetos/documentacao/HistoricoDocumento'
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/lib/clientFetch', () => ({ fetchWithSession: vi.fn() }))
const version = { id: 'v1', versao: '2', commitTitle: 'Novo objetivo', status: 'PENDING', createdAt: '2026-10-04T12:00:00Z', author: { name: 'Autora' }, payload: { objetivos: 'Conteúdo proposto', tenantId: 'não exibir' } }
function open(container: HTMLElement) {
  const details = container.querySelector('details')!
  details.open = true
  fireEvent(details, new Event('toggle'))
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(fetchWithSession).mockResolvedValue(Response.json({ versions: [version], canApprove: false, canDelete: false }))
})
describe('Histórico e Registro documental', () => {
  it('mostra proposta pendente, autoria e conteúdo sem liberar revisão ao membro', async () => {
    const { container } = render(<HistoricoDocumento projetoId="p1" type="CHARTER" />)
    open(container)
    expect(await screen.findByText('Novo objetivo')).toBeInTheDocument()
    expect(screen.getByText(/Pendente de aprovação · Autora/)).toBeInTheDocument()
    expect(screen.getByText('Conteúdo proposto')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
    expect(screen.queryByText('não exibir')).not.toBeInTheDocument()
  })
  it('aprovação envia somente a versão/ação e atualiza a publicação', async () => {
    vi.mocked(fetchWithSession).mockImplementation(async (_url, init) => {
      if (init?.method === 'PATCH') return Response.json({ ...version, status: 'APPROVED' })
      return Response.json({ versions: [version], canApprove: true, canDelete: false })
    })
    const published = vi.fn()
    window.addEventListener('operum:document-published', published)
    try {
      const { container } = render(<HistoricoDocumento projetoId="p1" type="CHARTER" />)
      open(container)
      fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
      await waitFor(() => expect(refresh).toHaveBeenCalled())
      expect(fetchWithSession).toHaveBeenCalledWith('/api/projects/p1/revisions', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ versionId: 'v1', action: 'approve' }) }))
      expect(published).toHaveBeenCalled()
    } finally { window.removeEventListener('operum:document-published', published) }
  })
  it('Registro exibe ação e nome do usuário e consulta a aba correta', async () => {
    vi.mocked(fetchWithSession).mockImplementation(async url => String(url).includes('tab=registro')
      ? Response.json([{ id: 'l1', action: 'DOCUMENTO_APROVAR', userId: 'u1', userName: 'Gerente', timestamp: '2026-10-04T12:00:00Z', details: { versionId: 'v1' } }])
      : Response.json({ versions: [version], canApprove: false, canDelete: false }))
    const { container } = render(<HistoricoDocumento projetoId="p1" type="EAP" />)
    open(container)
    await screen.findByText('Novo objetivo')
    fireEvent.click(screen.getByRole('button', { name: 'Registro' }))
    expect(await screen.findByText('Versão aprovada')).toBeInTheDocument()
    expect(screen.getByText(/Gerente/)).toBeInTheDocument()
    expect(fetchWithSession).toHaveBeenCalledWith(expect.stringContaining('type=EAP&resourceId=&tab=registro'))
  })
  it('falha de aprovação mostra o erro e preserva a proposta', async () => {
    vi.mocked(fetchWithSession).mockImplementation(async (_url, init) => init?.method === 'PATCH'
      ? Response.json({ error: 'Sem permissão para aprovar' }, { status: 403 })
      : Response.json({ versions: [version], canApprove: true, canDelete: false }))
    const { container } = render(<HistoricoDocumento projetoId="p1" type="ATA" resourceId="a1" />)
    open(container)
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão para aprovar')
    expect(screen.getByText('Conteúdo proposto')).toBeInTheDocument()
  })
})
