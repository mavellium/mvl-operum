import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
vi.mock('../prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }))
import { prisma } from '../prisma'
import { AuthService } from '../auth/auth.service'
const payload = { userId: 'u', tenantId: 't', role: 'admin', tokenVersion: 2, jti: 'j' }
const user = { id: 'u', tenantId: 't', role: 'member', tokenVersion: 2, isActive: true, status: 'active', deletedAt: null, tenant: { status: 'ACTIVE' } }
const jwt = { verify: vi.fn() }
const redis = { getSession: vi.fn(), deleteSession: vi.fn() }
const service = new AuthService(jwt as never, redis as never, {} as never)
beforeEach(() => {
  vi.resetAllMocks()
  jwt.verify.mockResolvedValue(payload)
  redis.getSession.mockResolvedValue(payload)
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never)
})
describe('SDD 11.1 revogação', () => {
  it('retorna papel persistido', async () => {
    expect(await service.verify('token')).toEqual({ userId: 'u', tenantId: 't', role: 'member' })
  })
  it.each([
    { tokenVersion: 3 }, { isActive: false }, { status: 'blocked' },
    { deletedAt: new Date() }, { tenantId: 'other' }, { tenant: { status: 'INACTIVE' } },
  ])('nega sessão ainda presente no Redis após alteração persistida %j', async change => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, ...change } as never)
    await expect(service.verify('token')).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('nega sessão removida após logout e recuperação', async () => {
    redis.getSession.mockResolvedValue(null)
    await expect(service.verify('token')).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('não confirma logout quando remoção falha', async () => {
    redis.deleteSession.mockRejectedValue(new ServiceUnavailableException())
    await expect(service.logout('j')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
  it('nega token sem jti', async () => {
    jwt.verify.mockResolvedValue({ ...payload, jti: undefined })
    await expect(service.verify('token')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(redis.getSession).not.toHaveBeenCalled()
  })
  it('distingue indisponibilidade de credencial inválida', async () => {
    redis.getSession.mockRejectedValueOnce(new ServiceUnavailableException())
    await expect(service.verify('token')).rejects.toBeInstanceOf(ServiceUnavailableException)
    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error('database unavailable'))
    await expect(service.verify('token')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
