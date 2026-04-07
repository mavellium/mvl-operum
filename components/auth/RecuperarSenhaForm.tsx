'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction, validateResetCodeAction, resetPasswordAction } from '@/app/actions/auth'

type Step = 'email' | 'code' | 'password' | 'done'

export function RecuperarSenhaForm() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  // Step 1 — email
  const [emailState, emailAction, emailPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      const result = await requestPasswordResetAction(prevState, formData)
      if (result.success) {
        setEmail((formData.get('email') as string).toLowerCase().trim())
        setStep('code')
      }
      return result
    },
    undefined,
  )

  // Step 2 — validate code
  const [codeState, codeAction, codePending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      const result = await validateResetCodeAction(prevState, formData)
      if (result.valid) {
        setCode((formData.get('code') as string).toUpperCase().trim())
        setStep('password')
      }
      return result
    },
    undefined,
  )

  // Step 3 — new password
  const [passState, passAction, passPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      const result = await resetPasswordAction(prevState, formData)
      if (result.success) setStep('done')
      return result
    },
    undefined,
  )

  // ── Step indicators ──
  const steps = ['Email', 'Código', 'Nova Senha']
  const stepIndex = step === 'email' ? 0 : step === 'code' ? 1 : step === 'password' ? 2 : 3

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-xl font-semibold text-gray-800">Recuperar Senha</h1>

      {/* Step indicators */}
      {step !== 'done' && (
        <div className="flex items-center justify-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                i < stepIndex ? 'bg-green-500 text-white'
                : i === stepIndex ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
              }`}>
                {i < stepIndex ? '✓' : i + 1}
              </span>
              <span className={`text-xs ${i === stepIndex ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < steps.length - 1 && <span className="w-6 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Email */}
      {step === 'email' && (
        <form action={emailAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seu@email.com"
            />
          </div>
          {(emailState as any)?.error && (
            <p className="text-sm text-red-600">{(emailState as any).error}</p>
          )}
          <button
            type="submit"
            disabled={emailPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {emailPending ? 'Enviando...' : 'Enviar código'}
          </button>
          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-blue-600 hover:underline">Voltar ao login</Link>
          </p>
        </form>
      )}

      {/* Step 2: Code */}
      {step === 'code' && (
        <form action={codeAction} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 text-center">
            Se existe uma conta com <strong>{email}</strong>, você receberá um código de recuperação.
          </p>
          <input type="hidden" name="email" value={email} />
          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-sm font-medium text-gray-700">Código de recuperação</label>
            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={8}
              autoComplete="off"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 text-center tracking-widest uppercase placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="XXXXXXXX"
            />
          </div>
          {(codeState as any)?.error && (
            <p className="text-sm text-red-600">{(codeState as any).error}</p>
          )}
          <button
            type="submit"
            disabled={codePending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {codePending ? 'Validando...' : 'Validar código'}
          </button>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="text-sm text-gray-500 hover:text-gray-700 text-center"
          >
            Reenviar código
          </button>
        </form>
      )}

      {/* Step 3: New password */}
      {step === 'password' && (
        <form action={passAction} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="code" value={code} />
          <div className="flex flex-col gap-1">
            <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">Nova senha</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirmar senha</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repita a nova senha"
            />
          </div>
          {(passState as any)?.error && (
            <p className="text-sm text-red-600">{(passState as any).error}</p>
          )}
          <button
            type="submit"
            disabled={passPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {passPending ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
        </form>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium text-center">Senha redefinida com sucesso!</p>
          <p className="text-sm text-gray-500 text-center">Você pode fazer login com sua nova senha.</p>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ir para o login
          </Link>
        </div>
      )}
    </div>
  )
}
