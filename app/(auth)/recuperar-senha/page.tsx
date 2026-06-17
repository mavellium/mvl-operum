import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'
import { RecuperarSenhaForm } from '@/components/auth/RecuperarSenhaForm'

export default function RecuperarSenhaPage() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[58fr_42fr]">
      <AuthBrandPanel />

      {/* ── Lado do formulário ── */}
      <div className="flex min-h-screen flex-col" style={{ background: 'var(--surface)' }}>
        {/* Faixa de gradiente no topo (mobile only) */}
        <div
          className="h-1 w-full lg:hidden"
          style={{ background: 'linear-gradient(90deg, var(--brand-1), var(--brand-2), var(--brand-3))' }}
        />
        <div className="flex flex-1 items-center justify-center p-6">
          <RecuperarSenhaForm />
        </div>
      </div>
    </div>
  )
}
