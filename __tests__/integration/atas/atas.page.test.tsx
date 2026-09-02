// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement, ReactNode } from 'react'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND — notFound() não deveria ser chamado')
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT — redirect() não deveria ser chamado')
  }),
}))

vi.mock('next/link', async () => {
  const React = await import('react')
  return {
    default: (props: { href?: string; children?: ReactNode }) =>
      React.createElement('a', props, props.children),
  }
})

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/projectService', () => ({
  findById: vi.fn(),
}))

vi.mock('@/services/projectRoleService', () => ({
  isProjectManager: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {},
}))

vi.mock('@/services/ataService', () => ({
  listarAtasPorProjeto: vi.fn(),
}))

vi.mock('@/app/actions/atas', () => ({
  removerAtaAction: vi.fn(),
}))

import AtasPage from '@/app/projetos/[projetoId]/atas/page'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import { listarAtasPorProjeto } from '@/services/ataService'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const mockFindById = findById as ReturnType<typeof vi.fn>
const mockIsManager = isProjectManager as ReturnType<typeof vi.fn>
const mockListarAtas = listarAtasPorProjeto as ReturnType<typeof vi.fn>

async function htmlFor(tree: Promise<ReactElement>): Promise<string> {
  return renderToStaticMarkup((await tree) as unknown as ReactElement)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ isAuth: true, userId: 'u1', role: 'admin', tenantId: 't1', token: 'x' })
  mockFindById.mockResolvedValue({ id: 'p1', name: 'Projeto Demo', tenantId: 't1' })
  mockIsManager.mockResolvedValue(true)
})

describe('GET /projetos/[projetoId]/atas (integração)', () => {
  it('projeto SEM atas → empty state, sem 500', async () => {
    mockListarAtas.mockResolvedValue([])

    const html = await htmlFor(AtasPage({ params: Promise.resolve({ projetoId: 'p1' }) }))

    expect(html).toContain('Nenhuma ata registrada ainda.')
    expect(html).toContain('+ Nova Ata')
  })

  it('ata INCOMPLETA (data/null, elaboradoPor/null) → renderiza fallbacks, sem 500', async () => {
    mockListarAtas.mockResolvedValue([
      {
        id: 'a1',
        numero: 1,
        data: null,
        elaboradoPor: null,
        local: null,
        presentes: [],
        acoes: [],
        anexos: [],
      },
    ])

    const html = await htmlFor(AtasPage({ params: Promise.resolve({ projetoId: 'p1' }) }))

    expect(html).not.toContain('Nenhuma ata registrada ainda.')
    expect(html).toContain('Elaborado por —')
    expect(html).toContain('Ver / Editar')
  })

  it('falha da query (ex.: tabela Ata ausente por migration não aplicada) → estado de erro, sem 500', async () => {
    mockListarAtas.mockRejectedValue(new Error('P2021: table does not exist'))

    const html = await htmlFor(AtasPage({ params: Promise.resolve({ projetoId: 'p1' }) }))

    expect(html).toContain('Atas indisponíveis')
    expect(html).toContain('migrações de banco')
  })
})