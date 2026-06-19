import { verifySession } from '@/lib/dal'
import { authApi } from '@/lib/api-client'
import NoProjectCard from '@/components/no-project/NoProjectCard'

export const dynamic = 'force-dynamic'

export default async function NoProjectPage() {
  await verifySession()
  // Falha defensiva: verifySession() já é o gate de autenticação real.
  // Se /auth/me falhar por algum motivo pontual, a tela ainda renderiza.
  const me = await authApi.me().catch(() => null)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <NoProjectCard
        name={me?.name ?? 'Usuário'}
        email={me?.email ?? ''}
        avatarUrl={me?.avatarUrl ?? null}
        cargo={me?.cargo ?? null}
        departamento={me?.departamento ?? null}
      />
    </div>
  )
}
