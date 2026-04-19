import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/projetoService', () => ({
  createProject: vi.fn(),
  findAllByTenant: vi.fn(),
  findById: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  addMember: vi.fn(),
}))

vi.mock('@/services/projectRoleService', () => ({
  setProjectManagerRole: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { createProject, findAllByTenant, findById, updateProject, deleteProject } from '@/services/projetoService'
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
    it('should create project and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(createProject).mockResolvedValue({
        id: 'p1',
        name: 'Novo Projeto',
        tenantId: 't1',
      })

      const result = await createProjetoAction({}, { name: 'Novo Projeto' })
      expect(result).toHaveProperty('projeto')
    })

    it('should return error on failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(createProject).mockRejectedValue(new Error('Validation error'))

      const result = await createProjetoAction({}, { name: '' })
      expect(result).toHaveProperty('error')
    })

    it('should return error if not authenticated', async () => {
      vi.mocked(verifySession).mockRejectedValue(new Error('Not authenticated'))

      const result = await createProjetoAction({}, { name: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('getProjetosAction', () => {
    it('should return list of projects for tenant', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(findAllByTenant).mockResolvedValue([
        { id: 'p1', name: 'Projeto 1' },
        { id: 'p2', name: 'Projeto 2' },
      ])

      const result = await getProjetosAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      vi.mocked(verifySession).mockRejectedValue(new Error('Auth error'))

      const result = await getProjetosAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })
  })

  describe('getProjetoAction', () => {
    it('should return single project by id', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(findById).mockResolvedValue({
        id: 'p1',
        name: 'Projeto 1',
        description: 'Description',
      })

      const result = await getProjetoAction('p1')
      expect(result).toHaveProperty('projeto')
      expect(result.projeto?.id).toBe('p1')
    })

    it('should return error if project not found', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'member' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(findById).mockResolvedValue(null)

      const result = await getProjetoAction('nonexistent')
      expect(result).toHaveProperty('error')
    })
  })

  describe('updateProjetoAction', () => {
    it('should update project and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(updateProject).mockResolvedValue({
        id: 'p1',
        name: 'Updated Name',
      })

      const result = await updateProjetoAction({}, 'p1', { name: 'Updated Name' })
      expect(result).toHaveProperty('projeto')
    })

    it('should return error on update failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(updateProject).mockRejectedValue(new Error('Not found'))

      const result = await updateProjetoAction({}, 'nonexistent', { name: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('deleteProjetoAction', () => {
    it('should delete project and return success', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(deleteProject).mockResolvedValue({ id: 'p1' })

      const result = await deleteProjetoAction('p1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error on delete failure', async () => {
      const mockSession = { userId: 'u1', tenantId: 't1', role: 'admin' }
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(deleteProject).mockRejectedValue(new Error('Not found'))

      const result = await deleteProjetoAction('nonexistent')
      expect(result).toHaveProperty('error')
    })
  })
})
