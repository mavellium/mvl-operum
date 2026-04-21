import { getUserProfileAction } from '@/app/actions/profile'
import ProfileForm from '@/components/profile/ProfileForm'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm'
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
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="flex-1 w-full">
              <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
              <p className="text-sm text-gray-500 mb-2">{profile.email}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 mt-3">
                {profile.cargo && (
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {profile.cargo}
                  </p>
                )}
                {profile.departamento && (
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    {profile.departamento}
                  </p>
                )}
                {profile.phone && (
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {profile.phone}
                  </p>
                )}
                {(profile.logradouro || profile.cidade) && (
                  <p className="text-sm text-gray-700 flex items-center gap-1.5 col-span-1 sm:col-span-2 mt-1">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="truncate">
                      {[profile.logradouro, profile.numero, profile.bairro, profile.cidade, profile.estado].filter(Boolean).join(', ')}
                    </span>
                  </p>
                )}
              </div>

              {profile.notes && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Observações</p>
                  <p className="text-sm text-slate-700 italic">&quot;{profile.notes}&quot;</p>
                </div>
              )}

              {(profile.hourlyRate ?? 0) > 0 && (
                <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100 text-sm font-medium">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  R$ {profile.hourlyRate!.toFixed(2)} / hora
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Dados pessoais</h2>
          {/* Adicionei os novos campos para que o form permita editar */}
          <ProfileForm
            name={profile.name}
            email={profile.email}
            cargo={profile.cargo}
            departamento={profile.departamento}
            hourlyRate={profile.hourlyRate ?? 0}
            phone={profile.phone}
            cep={profile.cep}
            logradouro={profile.logradouro}
            numero={profile.numero}
            complemento={profile.complemento}
            bairro={profile.bairro}
            cidade={profile.cidade}
            estado={profile.estado}
            notes={profile.notes}
            avatarUrl={profile.avatarUrl}
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