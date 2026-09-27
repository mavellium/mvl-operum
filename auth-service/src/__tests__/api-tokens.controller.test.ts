import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { ApiTokensController } from '../api-tokens/api-tokens.controller'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

function makeService() {
  return {
    create: vi.fn().mockResolvedValue({ id: 't1', token: 'opr_pat_x', prefix: 'opr_pat_x', expiresAt: new Date() }),
    list: vi.fn().mockResolvedValue([]),
    revoke: vi.fn().mockResolvedValue(undefined),
    introspect: vi.fn().mockResolvedValue({ active: false, userId: null, tenantId: null, role: null, scopes: [], tokenId: null }),
  }
}

describe('ApiTokensController', () => {
  let service: ReturnType<typeof makeService>
  let controller: ApiTokensController

  beforeEach(() => {
    service = makeService()
    controller = new ApiTokensController(service as any)
  })

  describe('create', () => {
    it('lança UnauthorizedException sem x-user-id', async () => {
      await expect(
        controller.create('', 'tenant-a', undefined, { name: 'x', scopes: ['read'] }),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('lança UnauthorizedException sem x-tenant-id', async () => {
      await expect(
        controller.create('user-1', '', undefined, { name: 'x', scopes: ['read'] }),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('lança ForbiddenException quando x-auth-type é pat', async () => {
      await expect(
        controller.create('user-1', 'tenant-a', 'pat', { name: 'x', scopes: ['read'] }),
      ).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('chama o service com dto validado quando headers presentes e auth não é pat', async () => {
      await controller.create('user-1', 'tenant-a', undefined, { name: 'x', scopes: ['read'] })
      expect(service.create).toHaveBeenCalledWith('user-1', 'tenant-a', { name: 'x', scopes: ['read'] })
    })
  })

  describe('list', () => {
    it('lança UnauthorizedException sem headers', async () => {
      await expect(controller.list('', 'tenant-a', undefined)).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('lança ForbiddenException quando x-auth-type é pat', async () => {
      await expect(controller.list('user-1', 'tenant-a', 'pat')).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('chama o service escopado quando headers presentes e auth não é pat', async () => {
      await controller.list('user-1', 'tenant-a', undefined)
      expect(service.list).toHaveBeenCalledWith('user-1', 'tenant-a')
    })
  })

  describe('revoke', () => {
    it('lança UnauthorizedException sem headers', async () => {
      await expect(controller.revoke('', 'tenant-a', undefined, 'token-1')).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('lança ForbiddenException quando x-auth-type é pat', async () => {
      await expect(controller.revoke('user-1', 'tenant-a', 'pat', 'token-1')).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('chama o service com id/userId/tenantId quando headers presentes e auth não é pat', async () => {
      await controller.revoke('user-1', 'tenant-a', undefined, 'token-1')
      expect(service.revoke).toHaveBeenCalledWith('token-1', 'user-1', 'tenant-a')
    })
  })

  describe('introspect', () => {
    it('não é marcado como @Public() — deve permanecer protegido pela InternalAuthGuard global', () => {
      const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, ApiTokensController.prototype.introspect)
      expect(isPublic).toBeFalsy()
    })

    it('chama o service com o token validado', async () => {
      await controller.introspect({ token: 'opr_pat_x' })
      expect(service.introspect).toHaveBeenCalledWith('opr_pat_x')
    })
  })
})
