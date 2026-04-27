// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  projectsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addMember: vi.fn(),
    upsertMacroFases: vi.fn(),
  },
  adminApi: {},
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { projectsApi } from '@/lib/api-client'
import {
  createProjetoAction,
  getProjetosAction,
  getProjetoAction,
  updateProjetoAction,
  deleteProjetoAction,
} from '@/app/actions/projetos'

const mockSession = { isAuth: true, userId: 'u1', tenantId: 't1', role: 'admin' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Projeto Actions', () => {
  describe('createProjetoAction', () => {
    it('should create project and return success', async () => {
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(projectsApi.create).mockResolvedValue({ id: 'p1', name: 'Novo Projeto' })

      const result = await createProjetoAction({}, { name: 'Novo Projeto' })
      expect(result).toHaveProperty('projeto')
    })

    it('should return error on failure', async () => {
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(projectsApi.create).mockRejectedValue(new Error('Validation error'))

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
      vi.mocked(projectsApi.list).mockResolvedValue({
        items: [
          { id: 'p1', name: 'Projeto 1' },
          { id: 'p2', name: 'Projeto 2' },
        ],
        total: 2,
      })

      const result = await getProjetosAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      vi.mocked(projectsApi.list).mockRejectedValue(new Error('Auth error'))

      const result = await getProjetosAction()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })
  })

  describe('getProjetoAction', () => {
    it('should return single project by id', async () => {
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(projectsApi.get).mockResolvedValue({ id: 'p1', name: 'Projeto 1', description: 'Description' })

      const result = await getProjetoAction('p1')
      expect(result).toHaveProperty('projeto')
      expect(result.projeto?.id).toBe('p1')
    })

    it('should return error if project not found', async () => {
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(projectsApi.get).mockResolvedValue(null as never)

      const result = await getProjetoAction('nonexistent')
      expect(result).toHaveProperty('error')
    })
  })

  describe('updateProjetoAction', () => {
    it('should update project and return success', async () => {
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(projectsApi.update).mockResolvedValue({ id: 'p1', name: 'Updated Name' })

      const result = await updateProjetoAction({}, 'p1', { name: 'Updated Name' })
      expect(result).toHaveProperty('projeto')
    })

    it('should return error on update failure', async () => {
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(projectsApi.update).mockRejectedValue(new Error('Not found'))

      const result = await updateProjetoAction({}, 'nonexistent', { name: 'Test' })
      expect(result).toHaveProperty('error')
    })
  })

  describe('deleteProjetoAction', () => {
    it('should delete project and return success', async () => {
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(projectsApi.delete).mockResolvedValue(undefined)

      const result = await deleteProjetoAction('p1')
      expect(result).toHaveProperty('success')
      expect(result.success).toBe(true)
    })

    it('should return error on delete failure', async () => {
      vi.mocked(verifySession).mockResolvedValue(mockSession)
      vi.mocked(projectsApi.delete).mockRejectedValue(new Error('Not found'))

      const result = await deleteProjetoAction('nonexistent')
      expect(result).toHaveProperty('error')
    })
  })
})
