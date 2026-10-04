import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { DepartmentService } from './department.service'
import { prisma } from '../prisma'
vi.mock('../prisma', () => ({ prisma: {
  department: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  userDepartment: { upsert: vi.fn(), delete: vi.fn() },
} }))
const db = vi.mocked(prisma, true)
let service: DepartmentService
beforeEach(() => { vi.resetAllMocks(); service = new DepartmentService() })

describe('DepartmentService — implementação ativa no project-service', () => {
  it('lista apenas departamentos ativos no tenant, em ordem alfabética', async () => {
    db.department.findMany.mockResolvedValue([])
    await service.list('t1')
    expect(db.department.findMany).toHaveBeenCalledWith({ where: { tenantId: 't1', deletedAt: null }, orderBy: { name: 'asc' } })
  })
  it('cria no tenant e recusa nome duplicado sem escrever', async () => {
    const dto = { tenantId: 't1', name: 'Engenharia', hourlyRate: 80 }
    db.department.findFirst.mockResolvedValue(null)
    await service.create(dto)
    expect(db.department.create).toHaveBeenCalledWith({ data: dto })
    db.department.create.mockClear()
    db.department.findFirst.mockResolvedValue({ id: 'd1' } as never)
    await expect(service.create(dto)).rejects.toThrow(ConflictException)
    expect(db.department.create).not.toHaveBeenCalled()
  })
  it('busca/atualiza no escopo ativo do tenant', async () => {
    db.department.findFirst.mockResolvedValue({ id: 'd1' } as never)
    await service.update('d1', 't1', { description: 'Novo texto' })
    expect(db.department.findFirst).toHaveBeenCalledWith({ where: { id: 'd1', tenantId: 't1', deletedAt: null }, include: { users: true } })
    expect(db.department.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { description: 'Novo texto' } })
  })
  it.each(['update', 'remove', 'addUser', 'removeUser'] as const)('recusa %s em departamento não visível antes de escrever', async operation => {
    db.department.findFirst.mockResolvedValue(null)
    const request = operation === 'update' ? service.update('outside', 't1', { name: 'Outro' })
      : operation === 'remove' ? service.remove('outside', 't1')
      : operation === 'addUser' ? service.addUser('outside', 't1', 'u1') : service.removeUser('outside', 't1', 'u1')
    await expect(request).rejects.toThrow(NotFoundException)
    expect(db.department.update).not.toHaveBeenCalled()
    expect(db.userDepartment.upsert).not.toHaveBeenCalled()
    expect(db.userDepartment.delete).not.toHaveBeenCalled()
  })
  it('remove por soft delete, preservando o contrato atual das associações', async () => {
    db.department.findFirst.mockResolvedValue({ id: 'd1' } as never)
    await service.remove('d1', 't1')
    expect(db.department.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { deletedAt: expect.any(Date) } })
    expect(db.userDepartment.delete).not.toHaveBeenCalled()
  })
  it('adiciona associação idempotente e remove a chave composta após conferir departamento', async () => {
    db.department.findFirst.mockResolvedValue({ id: 'd1' } as never)
    await service.addUser('d1', 't1', 'u1')
    expect(db.userDepartment.upsert).toHaveBeenCalledWith({ where: { userId_departmentId: { userId: 'u1', departmentId: 'd1' } }, create: { userId: 'u1', departmentId: 'd1' }, update: {} })
    await service.removeUser('d1', 't1', 'u1')
    expect(db.userDepartment.delete).toHaveBeenCalledWith({ where: { userId_departmentId: { userId: 'u1', departmentId: 'd1' } } })
  })
})
