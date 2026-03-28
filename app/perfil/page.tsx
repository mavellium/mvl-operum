import { getUserProfileAction } from '@/app/actions/profile'
import ProfileForm from '@/components/profile/ProfileForm'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm'
import AvatarUpload from '@/components/profile/AvatarUpload'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const result = await getUserProfileAction()
  const profile = 'profile' in result ? result.profile : null

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Não foi possível carregar o perfil.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-6">
            <AvatarUpload name={profile.name} avatarUrl={profile.avatarUrl} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{profile.name}</h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
              {profile.cargo && (
                <p className="text-sm text-gray-600 mt-1">{profile.cargo}</p>
              )}
              {profile.departamento && (
                <p className="text-xs text-gray-400">{profile.departamento}</p>
              )}
              {profile.valorHora > 0 && (
                <p className="text-xs text-green-600 mt-1 font-medium">R$ {profile.valorHora.toFixed(2)}/hora</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Dados pessoais</h2>
          <ProfileForm
            name={profile.name}
            email={profile.email}
            cargo={profile.cargo}
            departamento={profile.departamento}
            valorHora={profile.valorHora}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Alterar senha</h2>
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  )
}
