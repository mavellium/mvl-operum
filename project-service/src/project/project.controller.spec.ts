// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForbiddenException } from '@nestjs/common'
import { ProjectController } from './project.controller'

describe('ProjectController.getUserProjects', () => {
  let controller: ProjectController
  let service: { getUserActiveProjects: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    service = { getUserActiveProjects: vi.fn().mockResolvedValue([]) }
    controller = new ProjectController(service as never)
  })

  it('permite quando o :userId da URL é o mesmo do x-user-id (consultando os próprios projetos)', () => {
    controller.getUserProjects('user-1', 'user-1', 'member', 'tenant-a')
    expect(service.getUserActiveProjects).toHaveBeenCalledWith('user-1', 'tenant-a')
  })

  it('permite quando o chamador é admin, mesmo consultando outro usuário', () => {
    controller.getUserProjects('user-2', 'admin-1', 'admin', 'tenant-a')
    expect(service.getUserActiveProjects).toHaveBeenCalledWith('user-2', 'tenant-a')
  })

  it('bloqueia (403) quando um usuário não-admin tenta consultar outro usuário', () => {
    expect(() => controller.getUserProjects('user-2', 'user-1', 'member', 'tenant-a')).toThrow(ForbiddenException)
    expect(service.getUserActiveProjects).not.toHaveBeenCalled()
  })
})
