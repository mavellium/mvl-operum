import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/departamentoService', () => ({
  createDepartamento: vi.fn(),
  findAllByTenant: vi.fn(),
  updateDepartamento: vi.fn(),
  deactivate: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { createDepartamento, findAllByTenant, updateDepartamento, deactivate } from '@/services/departamentoService'
import {
  createDepartamentoAction,
  getDepartamentosAction,
  updateDepartamentoAction,
  deactivateDepartamentoAction,
} from '@/app/actions/departamentos'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Departamento Actions', () => {
  describe('createDepartamentoAction', () => {
    it('should create departamento and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(createDepartamento as any).mockResolvedValue({
        id: 'd1',
        nome: 'Engenharia',
        tenantId: 't1',
      })

      const result = await createDepartamentoAction({}, { nome: 'Engenharia' })
      expect(result).toHaveProperty('departamento')
      expect(result.departamento?.nome).toBe('Engenharia')
    })

    it('should return error on validation failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(createDepartamento as any).mockRejectedValue(new Error('Validation error'))

      const result = await createDepartamentoAction({}, { nome: '' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('getDepartamentosAction', () => {
    it('should return list of departamentos for tenant', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(findAllByTenant as any).mockResolvedValue([
        { id: 'd1', nome: 'Engenharia' },
        { id: 'd2', nome: 'Design' },
      ])

      const result = await getDepartamentosAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      ;(verifySession as any).mockRejectedValue(new Error('Auth error'))

      const result = await getDepartamentosAction()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('updateDepartamentoAction', () => {
    it('should update departamento and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateDepartamento as any).mockResolvedValue({
        id: 'd1',
        nome: 'Updated Dept',
      })

      const result = await updateDepartamentoAction({}, 'd1', { nome: 'Updated Dept' })
      expect(result).toHaveProperty('departamento')
    })

    it('should return error on update failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateDepartamento as any).mockRejectedValue(new Error('Not found'))

      const result = await updateDepartamentoAction({}, 'nonexistent', { nome: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('deactivateDepartamentoAction', () => {
    it('should deactivate departamento and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(deactivate as any).mockResolvedValue({ id: 'd1', ativo: false })

      const result = await deactivateDepartamentoAction('d1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error if deactivation fails', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(deactivate as any).mockRejectedValue(new Error('Has users'))

      const result = await deactivateDepartamentoAction('d1')
      expect(result).toHaveProperty('error')
    })
  })
})
