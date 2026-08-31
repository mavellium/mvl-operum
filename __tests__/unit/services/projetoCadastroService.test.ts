// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const m = {
    project: { findUnique: vi.fn() },
    department: { findUnique: vi.fn(), create: vi.fn() },
    role: { findUnique: vi.fn(), create: vi.fn() },
    projetoDepartamento: {
      findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(),
      findMany: vi.fn(), count: vi.fn(),
    },
    projetoFuncao: {
      findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(),
      findMany: vi.fn(), count: vi.fn(),
    },
  }
  return { default: m }
})

import prisma from '@/lib/prisma'
import {
  associarDepartamento,
  desassociarDepartamento,
  listarDepartamentosAssociados,
  associarFuncao,
  desassociarFuncao,
  listarFuncoesAssociadas,
  contAssociacoesDepartamento,
  contAssociacoesFuncao,
  NotFoundError,
} from '@/services/projetoCadastroService'

const mock = prisma as unknown as {
  project: { findUnique: ReturnType<typeof vi.fn> }
  department: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  role: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  projetoDepartamento: {
    findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>
  }
  projetoFuncao: {
    findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>
  }
}

const project = { id: 'p1', name: 'Alpha', tenantId: 't1' }

beforeEach(() => vi.clearAllMocks())

describe('associar/desassociar Departamento (não afeta catálogo)', () => {
  it('lança NotFoundError se o projeto não existe', async () => {
    mock.project.findUnique.mockResolvedValue(null)
    await expect(associarDepartamento('pX', 'd1')).rejects.toBeInstanceOf(NotFoundError)
    expect(mock.department.create).not.toHaveBeenCalled()
  })

  it('associa departamento sem criar novo no catálogo global', async () => {
    mock.project.findUnique.mockResolvedValue(project)
    mock.department.findUnique.mockResolvedValue({ id: 'd1', name: 'TI' })
    mock.projetoDepartamento.findUnique.mockResolvedValue(null)
    mock.projetoDepartamento.create.mockResolvedValue({ id: 'a1', projetoId: 'p1', departamentoId: 'd1' })

    await associarDepartamento('p1', 'd1')
    expect(mock.projetoDepartamento.create).toHaveBeenCalledWith({
      data: { projetoId: 'p1', departamentoId: 'd1' },
    })
    // catálogo global intocado
    expect(mock.department.create).not.toHaveBeenCalled()
  })

  it('é idempotente — retorna associação existente sem duplicar', async () => {
    mock.project.findUnique.mockResolvedValue(project)
    mock.department.findUnique.mockResolvedValue({ id: 'd1', name: 'TI' })
    mock.projetoDepartamento.findUnique.mockResolvedValue({ id: 'a1', projetoId: 'p1', departamentoId: 'd1' })

    const r = await associarDepartamento('p1', 'd1')
    expect(r).toMatchObject({ id: 'a1' })
    expect(mock.projetoDepartamento.create).not.toHaveBeenCalled()
  })

  it('desassocia e lança erro se não associado', async () => {
    mock.projetoDepartamento.findUnique.mockResolvedValue(null)
    await expect(desassociarDepartamento('p1', 'd1')).rejects.toBeInstanceOf(NotFoundError)

    mock.projetoDepartamento.findUnique.mockResolvedValue({ id: 'a1', projetoId: 'p1', departamentoId: 'd1' })
    mock.projetoDepartamento.delete.mockResolvedValue({ id: 'a1' })
    await desassociarDepartamento('p1', 'd1')
    expect(mock.projetoDepartamento.delete).toHaveBeenCalledWith({ where: { id: 'a1' } })
  })

  it('listar retorna apenas ids associados', async () => {
    mock.projetoDepartamento.findMany.mockResolvedValue([
      { departamentoId: 'd1' }, { departamentoId: 'd2' },
    ])
    await expect(listarDepartamentosAssociados('p1')).resolves.toEqual(['d1', 'd2'])
  })
})

describe('associar/desassociar Função (não afeta catálogo)', () => {
  it('associa função sem criar nova no catálogo global', async () => {
    mock.project.findUnique.mockResolvedValue(project)
    mock.role.findUnique.mockResolvedValue({ id: 'f1', name: 'Dev' })
    mock.projetoFuncao.findUnique.mockResolvedValue(null)
    mock.projetoFuncao.create.mockResolvedValue({ id: 'a1', projetoId: 'p1', funcaoId: 'f1' })

    await associarFuncao('p1', 'f1')
    expect(mock.projetoFuncao.create).toHaveBeenCalledWith({
      data: { projetoId: 'p1', funcaoId: 'f1' },
    })
    expect(mock.role.create).not.toHaveBeenCalled()
  })

  it('listar funções associadas mapeia ids', async () => {
    mock.projetoFuncao.findMany.mockResolvedValue([{ funcaoId: 'f1' }])
    await expect(listarFuncoesAssociadas('p1')).resolves.toEqual(['f1'])
  })
})

describe('bloqueio de delete do catálogo global', () => {
  it('contAssociacoesDepartamento/Funcao expõem uso para bloquear remoção', async () => {
    mock.projetoDepartamento.count.mockResolvedValue(2)
    mock.projetoFuncao.count.mockResolvedValue(0)
    await expect(contAssociacoesDepartamento('d1')).resolves.toBe(2)
    await expect(contAssociacoesFuncao('f1')).resolves.toBe(0)
  })
})
