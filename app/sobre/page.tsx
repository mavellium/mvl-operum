import { DESENVOLVEDORES, EQUIPE_INFO } from '@/lib/equipe'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sobre' }

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sobre o Operum</h1>
          <p className="text-sm text-gray-500 mt-1">
            Plataforma de gestão de projetos com Kanban, EAP, atas, custos e documentos.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
          <p className="text-sm text-gray-600 leading-relaxed">
            O Operum é um sistema de gestão de projetos desenvolvido como Trabalho de Conclusão de Curso,
            integrando fluxos de trabalho, documentação e controle de custos em um único ambiente.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900">Equipe de Desenvolvimento</h2>
          <p className="text-sm text-gray-500 mt-1">
            {EQUIPE_INFO.instituicao} · {EQUIPE_INFO.curso}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DESENVOLVEDORES.map((m, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                {m.nome
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(p => p[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{m.nome}</p>
                <p className="text-sm text-blue-600 font-medium">{m.papel}</p>
              </div>
              <div className="text-sm text-gray-500 space-y-0.5 mt-1">
                <p>{m.instituicao}</p>
                <p>{m.curso}</p>
                <p className="truncate">{m.email}</p>
                {m.rede && (
                  <a href={m.rede} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}