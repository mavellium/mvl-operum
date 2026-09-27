import { describe, it, expect, beforeEach } from 'vitest'
import { parseTokens, TenantRegistry, clearIdentityCache, MAX_TOKENS } from '../tenants'
import { FakeOperum } from './fakeOperum'

const PAT_A = 'opr_pat_AAAAAAAAAAAAAAAAAAAA'
const PAT_B = 'opr_pat_BBBBBBBBBBBBBBBBBBBB'
const PAT_C = 'opr_pat_CCCCCCCCCCCCCCCCCCCC'

describe('parseTokens', () => {
  it('aceita só o Authorization', () => {
    expect(parseTokens(`Bearer ${PAT_A}`, undefined)).toEqual([PAT_A])
  })

  it('junta Authorization (primeiro = padrão) e X-Operum-Tokens, sem duplicatas', () => {
    expect(parseTokens(`Bearer ${PAT_A}`, ` ${PAT_B} ,${PAT_A},${PAT_C}`)).toEqual([PAT_A, PAT_B, PAT_C])
  })

  it('aceita o header repetido (array)', () => {
    expect(parseTokens(`Bearer ${PAT_A}`, [PAT_B, PAT_C])).toEqual([PAT_A, PAT_B, PAT_C])
  })

  it('rejeita Authorization ausente, sem Bearer ou sem prefixo opr_pat_', () => {
    expect(parseTokens(undefined, PAT_B)).toBeNull()
    expect(parseTokens(PAT_A, undefined)).toBeNull()
    expect(parseTokens('Bearer eyJhbGciOiJIUzI1NiJ9.x.y', undefined)).toBeNull()
  })

  it('rejeita qualquer token extra malformado (evita repassar lixo ao gateway)', () => {
    expect(parseTokens(`Bearer ${PAT_A}`, `${PAT_B},nao-e-pat`)).toBeNull()
    expect(parseTokens(`Bearer ${PAT_A}`, 'opr_pat_abc!@#')).toBeNull()
  })

  it(`rejeita mais de ${MAX_TOKENS} tokens`, () => {
    const many = Array.from({ length: MAX_TOKENS }, (_, i) => `opr_pat_${'X'.repeat(20)}${i}`).join(',')
    expect(parseTokens(`Bearer ${PAT_A}`, many)).toBeNull()
  })
})

describe('TenantRegistry', () => {
  let op: FakeOperum
  const tokenUser: Record<string, string> = { [PAT_A]: 'u-a', [PAT_B]: 'u-b', [PAT_C]: 'u-c' }

  beforeEach(() => {
    clearIdentityCache()
    op = new FakeOperum()
    op.addTenant('t-a', 'Mavellium')
    op.addTenant('t-b', 'Fábio')
    op.addUser({ id: 'u-a', tenantId: 't-a', name: 'Vini', email: 'vini@x.com', role: 'admin' })
    op.addUser({ id: 'u-b', tenantId: 't-b', name: 'Vini', email: 'vini@x.com', role: 'member' })
  })

  const make = (tokens: string[]) => new TenantRegistry(tokens, t => op.gateway(tokenUser[t]))

  it('sem tenant_id resolve o token do Authorization, com nome do tenant', async () => {
    const ctx = await make([PAT_A, PAT_B]).resolve()
    expect(ctx).toMatchObject({ tenantId: 't-a', tenantName: 'Mavellium', userId: 'u-a', isDefault: true })
  })

  it('com tenant_id resolve o token daquele tenant', async () => {
    const ctx = await make([PAT_A, PAT_B]).resolve('t-b')
    expect(ctx).toMatchObject({ tenantId: 't-b', userId: 'u-b', isDefault: false })
  })

  it('tenant sem token configurado → erro acionável listando os disponíveis', async () => {
    await expect(make([PAT_A]).resolve('t-b')).rejects.toThrow(/Nenhum token configurado para o tenant t-b.*t-a \(Mavellium\)/)
  })

  it('só introspecta os demais tokens quando necessário', async () => {
    await make([PAT_A, PAT_B]).resolve()
    expect(op.calls.every(c => c.tenantId === 't-a')).toBe(true)
  })

  it('token inválido vira failure sem derrubar os outros tenants', async () => {
    // PAT_C revogado: o gateway responde 401 para ele
    const failing = new TenantRegistry([PAT_A, PAT_C], t => {
      if (t === PAT_C) {
        const err = Object.assign(new Error('Token inválido'), { status: 401 })
        return { get: () => Promise.reject(err), post: () => Promise.reject(err), patch: () => Promise.reject(err), delete: () => Promise.reject(err) }
      }
      return op.gateway('u-a')
    })
    const { contexts, failures } = await failing.listAll()
    expect(contexts.map(c => c.tenantId)).toEqual(['t-a'])
    expect(failures).toEqual([{ token_index: 1, status: 401, message: 'Token inválido' }])
  })

  it('dois tokens do mesmo tenant: vale o primeiro', async () => {
    const registry = new TenantRegistry([PAT_A, PAT_C], () => op.gateway('u-a'))
    const { contexts } = await registry.listAll()
    expect(contexts).toHaveLength(1)
    expect(contexts[0].isDefault).toBe(true)
  })
})
