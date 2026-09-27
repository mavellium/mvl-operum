// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundException } from '@nestjs/common'

vi.mock('../prisma', () => ({
  prisma: {
    role: { findFirst: vi.fn() },
    userProjectRole: { findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('../common/tenant-scope', () => ({ assertProjectInTenant: vi.fn(), assertUserInTenant: vi.fn() }))

import { prisma } from '../prisma'
import { assertProjectInTenant, assertUserInTenant } from '../common/tenant-scope'
import { RoleService } from './role.service'

const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>
const assertProject = assertProjectInTenant as unknown as ReturnType<typeof vi.fn>
const assertUser = assertUserInTenant as unknown as ReturnType<typeof vi.fn>

describe('RoleService — papéis de usuário por projeto (escopo por tenant)', () => {
  let service: RoleService

  beforeEach(() => {
    vi.clearAllMocks()
    assertProject.mockResolvedValue(undefined)
    assertUser.mockResolvedValue(undefined)
    db.role.findFirst.mockResolvedValue({ id: 'r1', tenantId: 't1' })
    service = new RoleService()
  })

  it('get/assign/remove respondem 404 para projeto de outro tenant', async () => {
    assertProject.mockRejectedValue(new NotFoundException())
    await expect(service.getUserProjectRoles('p-outro', 't1')).rejects.toThrow(NotFoundException)
    await expect(service.assignUserProjectRole('u1', 'p-outro', 'r1', 't1')).rejects.toThrow(NotFoundException)
    await expect(service.removeUserProjectRole('u1', 'p-outro', 't1')).rejects.toThrow(NotFoundException)
    expect(db.userProjectRole.findMany).not.toHaveBeenCalled()
    expect(db.userProjectRole.upsert).not.toHaveBeenCalled()
    expect(db.userProjectRole.update).not.toHaveBeenCalled()
  })

  it('assign rejeita usuário de outro tenant', async () => {
    assertUser.mockRejectedValue(new NotFoundException())
    await expect(service.assignUserProjectRole('u-outro', 'p1', 'r1', 't1')).rejects.toThrow(NotFoundException)
    expect(db.userProjectRole.upsert).not.toHaveBeenCalled()
  })

  it('assign rejeita role de outro tenant', async () => {
    db.role.findFirst.mockResolvedValue(null)
    await expect(service.assignUserProjectRole('u1', 'p1', 'r-outra', 't1')).rejects.toThrow(NotFoundException)
    expect(db.role.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'r-outra', tenantId: 't1' })
    expect(db.userProjectRole.upsert).not.toHaveBeenCalled()
  })
})
