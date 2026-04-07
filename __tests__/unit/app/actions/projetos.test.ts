import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/projetoService', () => ({
  createProjeto: vi.fn(),
  findAllByTenant: vi.fn(),
  findById: vi.fn(),
  updateProjeto: vi.fn(),
  deleteProjeto: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { createProjeto, findAllByTenant, findById, updateProjeto, deleteProjeto } from '@/services/projetoService'
import {
  createProjetoAction,
  getProjetosAction,
  getProjetoAction,
  updateProjetoAction,
  deleteProjetoAction,
} from '@/app/actions/projetos'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Projeto Actions', () => {
  describe('createProjetoAction', () => {
    it('should create projeto and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(createProjeto as any).mockResolvedValue({
        id: 'p1',
        nome: 'Novo Projeto',
        tenantId: 't1',
      })

      const result = await createProjetoAction({}, { nome: 'Novo Projeto' })
      expect(result).toHaveProperty('projeto')
      expect(result.projeto?.nome).toBe('Novo Projeto')
    })

    it('should return error on validation failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(createProjeto as any).mockRejectedValue(new Error('Validation error'))

      const result = await createProjetoAction({}, { nome: '' })
      expect(result).toHaveProperty('error')
    })

    it('should return error if not authenticated', async () => {
      ;(verifySession as any).mockRejectedValue(new Error('Not authenticated'))

      const result = await createProjetoAction({}, { nome: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('getProjetosAction', () => {
    it('should return list of projetos for tenant', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(findAllByTenant as any).mockResolvedValue([
        { id: 'p1', nome: 'Projeto 1' },
        { id: 'p2', nome: 'Projeto 2' },
      ])

      const result = await getProjetosAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      ;(verifySession as any).mockRejectedValue(new Error('Auth error'))

      const result = await getProjetosAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })
  })

  describe('getProjetoAction', () => {
    it('should return single projeto by id', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(findById as any).mockResolvedValue({
        id: 'p1',
        nome: 'Projeto 1',
        descricao: 'Description',
      })

      const result = await getProjetoAction('p1')
      expect(result).toHaveProperty('projeto')
      expect(result.projeto?.id).toBe('p1')
    })

    it('should return error if projeto not found', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(findById as any).mockResolvedValue(null)

      const result = await getProjetoAction('nonexistent')
      expect(result).toHaveProperty('error')
    })
  })

  describe('updateProjetoAction', () => {
    it('should update projeto and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateProjeto as any).mockResolvedValue({
        id: 'p1',
        nome: 'Updated Name',
      })

      const result = await updateProjetoAction({}, 'p1', { nome: 'Updated Name' })
      expect(result).toHaveProperty('projeto')
      expect(result.projeto?.nome).toBe('Updated Name')
    })

    it('should return error on update failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(updateProjeto as any).mockRejectedValue(new Error('Not found'))

      const result = await updateProjetoAction({}, 'nonexistent', { nome: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('deleteProjetoAction', () => {
    it('should delete projeto and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(deleteProjeto as any).mockResolvedValue({ id: 'p1' })

      const result = await deleteProjetoAction('p1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error on delete failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      ;(verifySession as any).mockResolvedValue(mockSession)
      ;(deleteProjeto as any).mockRejectedValue(new Error('Not found'))

      const result = await deleteProjetoAction('nonexistent')
      expect(result).toHaveProperty('error')
    })
  })
})
