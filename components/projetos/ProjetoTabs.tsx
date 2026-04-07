'use client'

import { useState } from 'react'
import Link from 'next/link'
import UserAvatar from '@/components/user/UserAvatar'

interface Sprint {
  id: string
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  createdAt: string
}

interface Membro {
  id: string
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  cargo: string | null
  role: string
  dataEntrada: string
}

interface Projeto {
  id: string
  nome: string
  descricao: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface Props {
  projetoId: string
  projeto: Projeto
  sprints: Sprint[]
  membros: Membro[]
  sprintStatusConfig: Record<string, { label: string; cls: string }>
  canEdit: boolean
}

type Tab = 'overview' | 'sprints' | 'membros'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  member: 'Membro',
}

export default function ProjetoTabs({ projetoId, projeto, sprints, membros, sprintStatusConfig, canEdit }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [sprintFilter, setSprintFilter] = useState('')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'sprints', label: `Sprints (${sprints.length})` },
    { id: 'membros', label: `Membros (${membros.length})` },
  ]

  const filteredSprints = sprintFilter
    ? sprints.filter(s => s.status === sprintFilter)
    : sprints

  const completedSprints = sprints.filter(s => s.status === 'COMPLETED').length
  const activeSprints = sprints.filter(s => s.status === 'ACTIVE').length

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{sprints.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total sprints</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{activeSprints}</p>
              <p className="text-xs text-gray-500 mt-1">Sprint ativa</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{completedSprints}</p>
              <p className="text-xs text-gray-500 mt-1">Concluídas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-medium text-gray-900 mb-3">Informações do Projeto</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24 shrink-0">Nome</dt>
                <dd className="text-gray-900">{projeto.nome}</dd>
              </div>
              {projeto.descricao && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-24 shrink-0">Descrição</dt>
                  <dd className="text-gray-900">{projeto.descricao}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24 shrink-0">Status</dt>
                <dd className="text-gray-900">{projeto.status}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24 shrink-0">Criado em</dt>
                <dd className="text-gray-900">{new Date(projeto.createdAt).toLocaleDateString('pt-BR')}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24 shrink-0">Membros</dt>
                <dd className="text-gray-900">{membros.length}</dd>
              </div>
            </dl>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/projetos/${projetoId}/dashboard`}
              className="flex-1 text-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
            >
              Ver Dashboard
            </Link>
            <button
              onClick={() => setActiveTab('sprints')}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
            >
              Ver Sprints
            </button>
          </div>
        </div>
      )}

      {/* Sprints tab */}
      {activeTab === 'sprints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <select
              value={sprintFilter}
              onChange={e => setSprintFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativa</option>
              <option value="PLANNED">Planejada</option>
              <option value="COMPLETED">Concluída</option>
            </select>
            {canEdit && (
              <Link
                href={`/sprints/nova?projetoId=${projetoId}`}
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
              >
                + Nova Sprint
              </Link>
            )}
          </div>

          {filteredSprints.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">Nenhuma sprint encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSprints.map(sprint => {
                const sc = sprintStatusConfig[sprint.status] ?? sprintStatusConfig.PLANNED
                return (
                  <div key={sprint.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{sprint.name}</p>
                      {sprint.startDate && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(sprint.startDate).toLocaleDateString('pt-BR')}
                          {sprint.endDate && ` — ${new Date(sprint.endDate).toLocaleDateString('pt-BR')}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                        {sc.label}
                      </span>
                      <Link
                        href={`/sprints/${sprint.id}`}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Membros tab */}
      {activeTab === 'membros' && (
        <div className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Link
                href={`/projetos/${projetoId}/membros`}
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
              >
                Gerenciar Membros
              </Link>
            </div>
          )}
          {membros.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">Nenhum membro neste projeto</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Membro</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Cargo</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Papel</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Entrou em</th>
                  </tr>
                </thead>
                <tbody>
                  {membros.map(membro => (
                    <tr key={membro.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={membro.name} avatarUrl={membro.avatarUrl} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{membro.name}</p>
                            <p className="text-xs text-gray-400">{membro.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{membro.cargo ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {ROLE_LABELS[membro.role] ?? membro.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 hidden sm:table-cell">
                        {new Date(membro.dataEntrada).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
