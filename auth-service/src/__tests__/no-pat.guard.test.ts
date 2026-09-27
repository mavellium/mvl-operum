import { describe, it, expect } from 'vitest'
import { ForbiddenException, ExecutionContext } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { NoPatGuard } from '../guards/no-pat.guard'
import { AuthController } from '../auth/auth.controller'
import { AdminController } from '../admin/admin.controller'

function ctx(headers: Record<string, string | undefined>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ headers }) }) } as unknown as ExecutionContext
}

describe('NoPatGuard', () => {
  const guard = new NoPatGuard()

  it('bloqueia requisições autenticadas por PAT', () => {
    expect(() => guard.canActivate(ctx({ 'x-auth-type': 'pat' }))).toThrow(ForbiddenException)
  })

  it('permite sessões JWT (sem x-auth-type)', () => {
    expect(guard.canActivate(ctx({ 'x-user-id': 'u1' }))).toBe(true)
  })
})

describe('rotas de sessão/conta protegidas contra PAT', () => {
  const guardsOf = (proto: object, method: string): unknown[] =>
    Reflect.getMetadata(GUARDS_METADATA, (proto as Record<string, unknown>)[method]) ?? []

  const authRoutes = ['logout', 'changePassword', 'updateProfile', 'alterarSenha', 'switchTenant', 'joinTenant', 'provisionTenantAdmin']
  for (const method of authRoutes) {
    it(`AuthController.${method} usa NoPatGuard`, () => {
      expect(guardsOf(AuthController.prototype, method)).toContain(NoPatGuard)
    })
  }

  const adminRoutes = ['createUser', 'updateUser', 'toggleActive', 'setRole']
  for (const method of adminRoutes) {
    it(`AdminController.${method} usa NoPatGuard`, () => {
      expect(guardsOf(AdminController.prototype, method)).toContain(NoPatGuard)
    })
  }

  it('leituras usadas pelo MCP continuam liberadas', () => {
    expect(guardsOf(AuthController.prototype, 'me')).not.toContain(NoPatGuard)
    expect(guardsOf(AuthController.prototype, 'myTenants')).not.toContain(NoPatGuard)
    expect(guardsOf(AdminController.prototype, 'listAllForTenant')).not.toContain(NoPatGuard)
  })
})
