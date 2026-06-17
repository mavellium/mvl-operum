import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecuperarSenhaForm } from '@/components/auth/RecuperarSenhaForm'

vi.mock('@/app/actions/auth', () => ({
  requestPasswordResetAction: vi.fn().mockResolvedValue({ success: true }),
  validateResetCodeAction: vi.fn().mockResolvedValue({ success: true }),
  resetPasswordAction: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

import {
  requestPasswordResetAction,
  validateResetCodeAction,
  resetPasswordAction,
} from '@/app/actions/auth'

const VALID_EMAIL = 'ana@x.com'
const VALID_CODE = 'A2BCDEFG'
const VALID_PASSWORD = 'Teste@123'

const TIMEOUT = { timeout: 5000 }

function wizard() {
  return screen.getByTestId('wizard')
}

/** Aguarda a transição do wizard para o step desejado. */
async function waitForStep(step: 'email' | 'code' | 'password' | 'done') {
  await waitFor(() => expect(wizard()).toHaveAttribute('data-step', step), TIMEOUT)
}

/** Preenche e submete a Etapa 1. */
async function submitStep1(user: ReturnType<typeof userEvent.setup>) {
  const emailInput = screen.getByRole('textbox', { name: /email/i })
  await user.clear(emailInput)
  await user.type(emailInput, VALID_EMAIL)
  await user.click(screen.getByRole('button', { name: 'Enviar código' }))
  await waitForStep('code')
}

/** Preenche e submete a Etapa 2 (OTP). */
async function submitStep2(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < VALID_CODE.length; i++) {
    await user.click(screen.getByTestId(`otp-cell-${i}`))
    await user.keyboard(VALID_CODE[i])
  }
  await user.click(screen.getByRole('button', { name: 'Validar código' }))
  await waitForStep('password')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requestPasswordResetAction).mockResolvedValue({ success: true })
  vi.mocked(validateResetCodeAction).mockResolvedValue({ success: true })
  vi.mocked(resetPasswordAction).mockResolvedValue({ success: true })
})

// ── Navegação entre etapas ────────────────────────────────────────────────────

describe('RecuperarSenhaForm — navegação', () => {
  it('começa na Etapa 1 (step=email)', () => {
    render(<RecuperarSenhaForm />)
    expect(wizard()).toHaveAttribute('data-step', 'email')
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeInTheDocument()
  })

  it('sempre renderiza os 8 inputs OTP no DOM (SlideStep não desmonta)', () => {
    render(<RecuperarSenhaForm />)
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`otp-cell-${i}`)).toBeInTheDocument()
    }
  })

  it('avança para step=code após submit do e-mail', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    expect(wizard()).toHaveAttribute('data-step', 'code')
  })

  it('avança para step=password após validação do código', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    await submitStep2(user)
    expect(wizard()).toHaveAttribute('data-step', 'password')
  })

  it('exibe estado de sucesso (step=done) após redefinir senha', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    await submitStep2(user)

    await user.type(screen.getByLabelText('Nova senha'), VALID_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar senha'), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))
    await waitForStep('done')

    expect(screen.getByText(/senha redefinida/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ir para o login/i })).toBeInTheDocument()
  })

  it('Botão Voltar na Etapa 2 retorna para step=email', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    await user.click(screen.getByRole('button', { name: /voltar/i }))
    await waitForStep('email')
  })
})

// ── Mantém e-mail entre etapas ────────────────────────────────────────────────

describe('RecuperarSenhaForm — persiste e-mail', () => {
  it('exibe o e-mail digitado na mensagem da Etapa 2', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    expect(screen.getByText(VALID_EMAIL)).toBeInTheDocument()
  })

  it('passa o e-mail via hidden input no reset final', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    await submitStep2(user)

    await user.type(screen.getByLabelText('Nova senha'), VALID_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar senha'), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }))
    await waitFor(() => expect(resetPasswordAction).toHaveBeenCalled(), TIMEOUT)

    const formData = vi.mocked(resetPasswordAction).mock.calls[0][1] as FormData
    expect(formData.get('email')).toBe(VALID_EMAIL)
  })
})

// ── Checklist de senha ────────────────────────────────────────────────────────

describe('RecuperarSenhaForm — checklist de senha', () => {
  it('checklist aparece ao digitar na Etapa 3', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    await submitStep2(user)

    await user.type(screen.getByLabelText('Nova senha'), 'abc')
    expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument()
  })

  it('critério de número fica marcado quando atendido', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    await submitStep2(user)

    await user.type(screen.getByLabelText('Nova senha'), 'Abcde1')
    expect(screen.getByText(/pelo menos um número/i)).toBeInTheDocument()
  })

  it('botão Redefinir fica desabilitado até todos os critérios passarem', async () => {
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)
    await submitStep2(user)

    const btn = screen.getByRole('button', { name: 'Redefinir senha' })
    expect(btn).toBeDisabled()

    await user.type(screen.getByLabelText('Nova senha'), VALID_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar senha'), VALID_PASSWORD)
    expect(btn).not.toBeDisabled()
  })
})

// ── Erros ──────────────────────────────────────────────────────────────────────

describe('RecuperarSenhaForm — erros', () => {
  it('exibe erro da Etapa 1 e permanece em step=email', async () => {
    vi.mocked(requestPasswordResetAction).mockResolvedValueOnce({ error: 'Email inválido' })
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), VALID_EMAIL)
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    await waitFor(() => expect(requestPasswordResetAction).toHaveBeenCalled(), TIMEOUT)

    // Erro deve aparecer e step não muda
    await waitFor(() => expect(screen.getAllByText('Email inválido').length).toBeGreaterThan(0), TIMEOUT)
    expect(wizard()).toHaveAttribute('data-step', 'email')
  })

  it('exibe erro da Etapa 2 e permanece em step=code', async () => {
    vi.mocked(validateResetCodeAction).mockResolvedValueOnce({ error: 'Código inválido ou expirado.' })
    const user = userEvent.setup()
    render(<RecuperarSenhaForm />)
    await submitStep1(user)

    for (let i = 0; i < VALID_CODE.length; i++) {
      await user.click(screen.getByTestId(`otp-cell-${i}`))
      await user.keyboard(VALID_CODE[i])
    }
    await user.click(screen.getByRole('button', { name: 'Validar código' }))
    await waitFor(() => expect(validateResetCodeAction).toHaveBeenCalled(), TIMEOUT)

    await waitFor(
      () => expect(screen.getAllByText('Código inválido ou expirado.').length).toBeGreaterThan(0),
      TIMEOUT,
    )
    expect(wizard()).toHaveAttribute('data-step', 'code')
  })
})
