import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MembroEquipeSelect from '@/components/projetos/documentacao/MembroEquipeSelect'
import { ToastProvider } from '@/components/ui/Toast'

// ── Server action de criação de membro — mockada (não exercita auth-service) ──
vi.mock('@/app/actions/membros', () => ({
  criarMembroEquipeAction: vi.fn(),
}))
import { criarMembroEquipeAction } from '@/app/actions/membros'

// ── Helpers ─────────────────────────────────────────────────────────────────

const MEMBROS = [
  { id: 'ana', name: 'Ana', setor: null },
  { id: 'joao', name: 'João', setor: null, pendente: true },
]

function renderSelect() {
  const onChange = vi.fn()
  const onCriarMembro = vi.fn()
  const utils = render(
    <ToastProvider>
      <MembroEquipeSelect
        membros={MEMBROS}
        projetoId="p1"
        onChange={onChange}
        onCriarMembro={onCriarMembro}
      />
    </ToastProvider>,
  )
  return { onChange, onCriarMembro, ...utils }
}

const preencherFormulario = async () => {
  await userEvent.type(screen.getByPlaceholderText('Nome completo'), 'Pedro')
  await userEvent.type(screen.getByPlaceholderText('email@exemplo.com'), 'pedro@test.com')
  await userEvent.type(screen.getByPlaceholderText('Mínimo de 8 caracteres'), 'senha1234')
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Testes ───────────────────────────────────────────────────────────────────

describe('MembroEquipeSelect', () => {
  it('lista os membros da equipe e marca os de cadastro pendente', () => {
    renderSelect()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'João — Pendente' })).toBeInTheDocument()
  })

  it('abre o modal de criação pela opção "＋ Criar novo membro…" do select', async () => {
    renderSelect()
    await userEvent.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: '＋ Criar novo membro…' }),
    )
    await waitFor(() =>
      expect(screen.getByText('Criar novo membro da equipe')).toBeInTheDocument(),
    )
  })

  it('cria um novo membro de forma simples, seleciona-o e exibe sucesso com pendência', async () => {
    const { onChange, onCriarMembro } = renderSelect()
    vi.mocked(criarMembroEquipeAction).mockResolvedValue({
      membro: { id: 'pedro', name: 'Pedro' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Criar novo membro da equipe' }))
    await preencherFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Criar membro' }))

    await waitFor(() => {
      expect(onCriarMembro).toHaveBeenCalledWith({
        id: 'pedro', name: 'Pedro', setor: null, pendente: true,
      })
      expect(onChange).toHaveBeenCalledWith({
        id: 'pedro', name: 'Pedro', setor: null, pendente: true,
      })
    })
    // Notificação de sucesso menciona a pendência de cadastro
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert').textContent).toContain('pendente')
  })

  it('exibe notificação de falha e mantém o modal aberto quando a criação falha', async () => {
    renderSelect()
    vi.mocked(criarMembroEquipeAction).mockResolvedValue({
      error: 'Somente administradores podem criar novos membros da equipe. Solicite a um administrador que crie o usuário.',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Criar novo membro da equipe' }))
    await preencherFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Criar membro' }))

    // Modal permanece aberto com a mensagem de erro inline + toast de falha
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert').textContent).toContain('Somente administradores')
    expect(screen.getByText('Criar novo membro da equipe')).toBeInTheDocument()
  })
})