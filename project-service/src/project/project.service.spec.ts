// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundException } from '@nestjs/common'

vi.mock('../prisma', () => ({
  prisma: {
    project: { findFirst: vi.fn() },
    userProject: { upsert: vi.fn() },
  },
}))

vi.mock('../common/tenant-scope', () => ({ assertUserInTenant: vi.fn() }))

import { prisma } from '../prisma'
import { assertUserInTenant } from '../common/tenant-scope'
import { ProjectService, UpdateProjectSchema } from './project.service'

const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>
const assertUser = assertUserInTenant as unknown as ReturnType<typeof vi.fn>

describe('ProjectService.addMember', () => {
  let service: ProjectService

  beforeEach(() => {
    vi.clearAllMocks()
    db.project.findFirst.mockResolvedValue({ id: 'p1', tenantId: 't1' })
    assertUser.mockResolvedValue(undefined)
    service = new ProjectService()
  })

  it('rejeita (404) usuário de outro tenant como membro', async () => {
    assertUser.mockRejectedValue(new NotFoundException())
    await expect(service.addMember('p1', 't1', 'u-outro', {})).rejects.toThrow(NotFoundException)
    expect(db.userProject.upsert).not.toHaveBeenCalled()
  })

  it('adiciona usuário do mesmo tenant', async () => {
    db.userProject.upsert.mockResolvedValue({})
    await service.addMember('p1', 't1', 'u1', { role: 'dev' })
    expect(assertUser).toHaveBeenCalledWith('u1', 't1')
    expect(db.userProject.upsert).toHaveBeenCalled()
  })
})

describe('UpdateProjectSchema', () => {
  it('aceita mudança de status (usado para arquivar projeto)', () => {
    expect(UpdateProjectSchema.parse({ status: 'ARCHIVED' })).toEqual({ status: 'ARCHIVED' })
    expect(UpdateProjectSchema.safeParse({ status: 'APAGADO' }).success).toBe(false)
  })
})
