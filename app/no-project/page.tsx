import { verifySession } from '@/lib/dal'
import { logoutAction } from '@/app/actions/auth'

export default async function NoProjectPage() {
  await verifySession()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Sem acesso a projetos</h1>
        <p className="text-sm text-gray-500 mt-2 mb-6">
          Você não está associado a nenhum projeto active. Entre em contato com o administrador.
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
