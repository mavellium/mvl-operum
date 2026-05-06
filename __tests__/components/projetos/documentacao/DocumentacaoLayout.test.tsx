import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import DocumentacaoLayout from '@/components/projetos/documentacao/DocumentacaoLayout'

vi.mock('@/components/projetos/DocumentoStakeholders', () => ({
  default: () => <div data-testid="stakeholder-doc">Formulário de Partes Interessadas</div>,
}))

vi.mock('@/components/projetos/documentacao/ProjectCharterWrapper', () => ({
  default: () => <div data-testid="charter-doc">Termo de Abertura</div>,
}))

const mockReplace = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useRouter).mockReturnValue({ replace: mockReplace, push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() } as unknown as ReturnType<typeof useRouter>)
  vi.mocked(usePathname).mockReturnValue('/projetos/p1/documentacao')
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
})

describe('DocumentacaoLayout', () => {
  it('renderiza o Formulário de Partes Interessadas por padrão', () => {
    render(<DocumentacaoLayout />)
    expect(screen.getByTestId('stakeholder-doc')).toBeInTheDocument()
    expect(screen.queryByTestId('charter-doc')).not.toBeInTheDocument()
  })

  it('renderiza o Termo de Abertura quando ?doc=charter', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('doc=charter') as ReturnType<typeof useSearchParams>,
    )
    render(<DocumentacaoLayout />)
    expect(screen.getByTestId('charter-doc')).toBeInTheDocument()
    expect(screen.queryByTestId('stakeholder-doc')).not.toBeInTheDocument()
  })

  it('ao clicar em "Termo de Abertura", chama router.replace com ?doc=charter', async () => {
    const user = userEvent.setup()
    render(<DocumentacaoLayout />)
    await user.click(screen.getByRole('button', { name: /termo de abertura/i }))
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('doc=charter'),
    )
  })

  it('ao clicar em "Formulário de Partes Interessadas" quando charter ativo, chama router.replace com ?doc=stakeholder', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('doc=charter') as ReturnType<typeof useSearchParams>,
    )
    const user = userEvent.setup()
    render(<DocumentacaoLayout />)
    await user.click(screen.getByRole('button', { name: /formulário de partes interessadas/i }))
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('doc=stakeholder'),
    )
  })

  it('item ativo na sidebar tem estilo de destaque', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('doc=charter') as ReturnType<typeof useSearchParams>,
    )
    render(<DocumentacaoLayout />)
    const charterBtn = screen.getByRole('button', { name: /termo de abertura/i })
    expect(charterBtn.className).toContain('text-blue-700')
  })

  it('container principal tem overflow-hidden para isolar o scroll global', () => {
    render(<DocumentacaoLayout />)
    const layout = screen.getByTestId('doc-layout')
    expect(layout.className).toMatch(/overflow-hidden/)
  })

  it('área de conteúdo tem overflow-y-auto para scroll isolado do documento', () => {
    render(<DocumentacaoLayout />)
    const content = screen.getByTestId('doc-content')
    expect(content.className).toMatch(/overflow-y-auto/)
  })
})
