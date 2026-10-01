// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Permissao } from '@/lib/permissoes'
import { validarCamposCustos } from '@/lib/permissoesCustos'

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  wbsNode: { findFirst: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ default: { $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) } }))
import { updateNodeProperties } from '@/services/wbsService'
const permissions = (...p: Permissao[]) => new Set(p)
const input = { nodeId: 'n1', projectId: 'p1', tenantId: 't1', properties: { tempoRealMinutos: 30 } }

beforeEach(() => {
  vi.resetAllMocks()
  tx.$queryRaw.mockResolvedValue([{ id: 'n1' }])
  tx.wbsNode.findFirst.mockResolvedValueOnce({ id: 'n1', properties: { elaboradoPorUserId: 'u1', tempoMinutos: 100 } }).mockResolvedValue({ id: 'root', version: 1 })
  tx.wbsNode.update.mockResolvedValue({ version: 2 })
})

describe('Custos — permissões por campo e responsável persistido', () => {
  it.each(['tempoRealMinutos', 'materiaisReal', 'dataRealizacao', 'percentualConclusao'])('permite %s da própria linha', campo => {
    expect(() => validarCamposCustos(permissions('planilha:realizado-proprio'), 'u1', { elaboradoPorUserId: 'u1' }, { [campo]: 10 })).not.toThrow()
  })
  it.each([null, undefined, '', 'u2'])('recusa realizado próprio sem vínculo por ID (%s)', elaboradoPorUserId => {
    expect(() => validarCamposCustos(permissions('planilha:realizado-proprio'), 'u1', { elaboradoPorUserId, elaboradoPor: 'Mesmo nome' }, { tempoRealMinutos: 10 })).toThrow('Sem permissão')
  })
  it.each(['tempoMinutos', 'materiais', 'dataPrevista', 'elaboradoPorUserId', 'elaboradoPor', 'cost', 'durationDays'])('recusa campo orçado %s para quem só edita realizado', campo => {
    expect(() => validarCamposCustos(permissions('planilha:realizado-proprio'), 'u1', { elaboradoPorUserId: 'u1' }, { [campo]: 10 })).toThrow('Sem permissão')
  })
  it('editar orçado não concede edição do realizado', () => {
    expect(() => validarCamposCustos(permissions('planilha:orcado'), 'u1', {}, { tempoRealMinutos: 10 })).toThrow('Sem permissão')
  })
  it('realizado de todos não concede edição do orçado ou de metadados', () => {
    expect(() => validarCamposCustos(permissions('planilha:realizado-todos'), 'u1', {}, { tempoRealMinutos: 10 })).not.toThrow()
    expect(() => validarCamposCustos(permissions('planilha:realizado-todos'), 'u1', {}, { description: 'alterada' })).toThrow('Sem permissão')
    expect(() => validarCamposCustos(permissions('planilha:realizado-todos'), 'u1', {}, { tempoMinutos: 10 })).toThrow('Sem permissão')
  })
  it('bloqueia tentativa de trocar responsável e realizado na mesma chamada', async () => {
    await expect(updateNodeProperties({ ...input, properties: { elaboradoPorUserId: 'u1', tempoRealMinutos: 30 } }, { userId: 'u2', permissoes: permissions('planilha:realizado-proprio') })).rejects.toThrow('Sem permissão')
    expect(tx.wbsNode.update).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })
  it('bloqueia leitura de nó de outro projeto/tenant antes de qualquer gravação', async () => {
    tx.wbsNode.findFirst.mockReset().mockResolvedValue(null)
    await expect(updateNodeProperties(input, { userId: 'u1', permissoes: permissions('planilha:realizado-todos') })).rejects.toThrow('Nó não encontrado')
    expect(tx.wbsNode.findFirst).toHaveBeenCalledWith({ where: { id: 'n1', projectId: 'p1', tenantId: 't1' } })
    expect(tx.wbsNode.update).not.toHaveBeenCalled()
  })
  it('bloqueia a linha antes de conferir responsável; merge e auditoria usam a mesma transação', async () => {
    expect(await updateNodeProperties(input, { userId: 'u1', permissoes: permissions('planilha:realizado-proprio') })).toEqual({ serverVersion: 2 })
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.wbsNode.findFirst.mock.invocationCallOrder[0])
    expect(tx.wbsNode.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { properties: { elaboradoPorUserId: 'u1', tempoMinutos: 100, tempoRealMinutos: 30 } } })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: { tenantId: 't1', userId: 'u1', action: 'PLANILHA_EDITAR', entity: 'WbsNode', entityId: 'n1', details: { projetoId: 'p1', campos: ['tempoRealMinutos'] } } })
  })
})
