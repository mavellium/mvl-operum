// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const m = {
    ata: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    ataPresente: { deleteMany: vi.fn() },
    ataAcao: { deleteMany: vi.fn() },
    ataAnexo: { deleteMany: vi.fn() },
    project: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  }
  return { default: m }
})

import prisma from '@/lib/prisma'
import { criarAta, atualizarAta, listarAtasPorProjeto } from '@/services/ataService'
import { NotFoundError } from '@/services/projetoCadastroService'
import { CriarAtaSchema } from '@/lib/validation/ataSchemas'

const mock = prisma as unknown as {
  ata: {
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  ataPresente: { deleteMany: ReturnType<typeof vi.fn> }
  ataAcao: { deleteMany: ReturnType<typeof vi.fn> }
  ataAnexo: { deleteMany: ReturnType<typeof vi.fn> }
  project: { findFirst: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

beforeEach(() => vi.clearAllMocks())

describe('criarAta — numeração sequencial transacional e datas sem hora', () => {
  it('persiste userId e normaliza data/prazo para date-only', async () => {
    mock.project.findFirst.mockResolvedValue({ id: 'p1', name: 'Alpha' })
    // $transaction repassa o próprio mock como tx (mesmas operações)
    mock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(mock))
    mock.ata.findFirst.mockResolvedValue({ numero: 3 })
    mock.ata.create.mockResolvedValue({ id: 'a1', numero: 4 })

    const input = CriarAtaSchema.parse({
      projetoId: 'p1',
      local: 'Sala A',
      data: '2026-09-01T18:45:00.000Z',
      elaboradoPor: 'Ana',
      elaboradoPorUserId: 'u1',
      aprovadoPor: 'Bruno',
      aprovadoPorUserId: 'u2',
      copiasPara: [],
      presentes: [
        { nome: 'Ana', setorEmpresa: 'Financeiro', userId: 'u1' },
      ],
      acoes: [
        { acao: 'Revisar cronograma', prazo: '2026-09-15T23:59:59.000Z', responsavel: 'Bruno', responsavelUserId: 'u2' },
      ],
      anexos: [],
    })

    await criarAta('t1', input)

    expect(mock.ata.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projetoId: 'p1' }, orderBy: { numero: 'desc' } }),
    )

    const createData = mock.ata.create.mock.calls[0][0].data
    // id = 3 + 1 = 4
    expect(createData.numero).toBe(4)
    expect(createData.elaboradoPorUserId).toBe('u1')
    expect(createData.aprovadoPorUserId).toBe('u2')
    // Data sem hora (meia-noite local)
    const stored = createData.data as Date
    expect(stored.getHours()).toBe(0)
    expect(stored.getMinutes()).toBe(0)
    expect(stored.getDate()).toBe(1)
    // Presente com userId
    expect(createData.presentes.create[0]).toMatchObject({ nome: 'Ana', setorEmpresa: 'Financeiro', userId: 'u1' })
    // Ação com prazo date-only e responsavelUserId
    const acao = createData.acoes.create[0]
    expect(acao.responsavelUserId).toBe('u2')
    expect((acao.prazo as Date).getHours()).toBe(0)
  })

  it('lança NotFoundError quando o projeto não existe', async () => {
    mock.project.findFirst.mockResolvedValue(null)
    const input = CriarAtaSchema.parse({
      projetoId: 'pX',
      data: '2026-09-01T00:00:00.000Z',
      elaboradoPor: 'Ana',
      copiasPara: [],
      presentes: [],
      acoes: [],
      anexos: [],
    })
    await expect(criarAta('t1', input)).rejects.toBeInstanceOf(NotFoundError)
    expect(mock.ata.create).not.toHaveBeenCalled()
  })
})

describe('atualizarAta — reconstrói relacionamentos com userId', () => {
  it('apaga itens antigos e recria preservando userId', async () => {
    mock.ata.findFirst.mockResolvedValue({ id: 'a1', tenantId: 't1', deletedAt: null })
    mock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(mock))

    const input = {
      local: 'Online',
      data: '2026-09-02T10:00:00.000Z',
      elaboradoPor: 'Ana',
      elaboradoPorUserId: 'u1',
      aprovadoPor: null,
      aprovadoPorUserId: null,
      assuntosTratados: null,
      decisoesTomadas: null,
      observacoes: null,
      copiasPara: ['a@b.com'],
      presentes: [{ nome: 'Ana', setorEmpresa: 'Financeiro', userId: 'u1' }],
      acoes: [],
      anexos: [{ nome: 'Doc', url: 'http://x' }],
    }

    await atualizarAta('t1', 'a1', input)

    expect(mock.ataPresente.deleteMany).toHaveBeenCalledWith({ where: { ataId: 'a1' } })
    expect(mock.ataAcao.deleteMany).toHaveBeenCalledWith({ where: { ataId: 'a1' } })
    expect(mock.ataAnexo.deleteMany).toHaveBeenCalledWith({ where: { ataId: 'a1' } })

    const updateData = mock.ata.update.mock.calls[0][0].data
    expect(updateData.data as Date).toHaveProperty('getHours')
    expect((updateData.data as Date).getHours()).toBe(0)
    expect(updateData.presentes.create[0]).toMatchObject({ userId: 'u1' })
    expect(updateData.anexos.create[0]).toMatchObject({ nome: 'Doc', url: 'http://x' })
  })

  it('lança NotFoundError quando a ata não existe', async () => {
    mock.ata.findFirst.mockResolvedValue(null)
    const input = {
      data: '2026-09-02T00:00:00.000Z',
      elaboradoPor: 'Ana',
      copiasPara: [],
      presentes: [],
      acoes: [],
      anexos: [],
    }
    await expect(atualizarAta('t1', 'aX', input)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('listarAtasPorProjeto — inclui relações de usuário', () => {
  it('busca por projeto e inclui presentes/acoes/anexos', async () => {
    mock.ata.findMany.mockResolvedValue([])
    await listarAtasPorProjeto('p1')
    expect(mock.ata.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projetoId: 'p1', deletedAt: null },
        orderBy: [{ numero: 'desc' }],
      }),
    )
  })
})
