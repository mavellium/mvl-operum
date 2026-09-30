import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'

/** Cache só de respostas positivas: card do tenant continua do tenant (não muda de dono). */
const CACHE_TTL_MS = 30_000
const CACHE_MAX = 5_000
const REQUEST_TIMEOUT_MS = 5_000

/**
 * Confere no sprint-service se cards pertencem ao tenant (SDD 4.1). O
 * file-service não conhece cards nem tenants: sem isto, qualquer JWT ou PAT
 * que passasse pelo gateway anexava, listava, renomeava ou excluía anexos de
 * cards de outro tenant só sabendo o id. Falha fechada: se o sprint-service
 * não responder, a operação é recusada (503), nunca liberada.
 */
@Injectable()
export class CardScope {
  private readonly logger = new Logger(CardScope.name)
  private readonly baseUrl = (process.env.SPRINT_SERVICE_URL ?? 'http://sprint-service:4003').replace(/\/$/, '')
  private readonly cache = new Map<string, number>()

  /** Dos cardIds, os que são de cards (não excluídos) do tenant. */
  async inTenant(tenantId: string, cardIds: string[]): Promise<Set<string>> {
    const now = Date.now()
    const allowed = new Set<string>()
    const unknown: string[] = []
    for (const id of new Set(cardIds)) {
      const exp = this.cache.get(`${tenantId}:${id}`)
      if (exp && exp > now) allowed.add(id)
      else unknown.push(id)
    }
    // A rota do sprint-service aceita até 500 ids por chamada.
    for (let i = 0; i < unknown.length; i += 500) {
      for (const id of await this.fetchInTenant(tenantId, unknown.slice(i, i + 500))) {
        allowed.add(id)
        this.remember(`${tenantId}:${id}`, now + CACHE_TTL_MS)
      }
    }
    return allowed
  }

  /** 404 (não 403) se o card não é do tenant: não confirma que o id existe. */
  async assert(tenantId: string, cardId: string): Promise<void> {
    if (!(await this.inTenant(tenantId, [cardId])).has(cardId)) {
      throw new NotFoundException('Card não encontrado')
    }
  }

  private async fetchInTenant(tenantId: string, ids: string[]): Promise<string[]> {
    // main.ts já aborta sem a chave; aqui fica explícito que não há conferência sem ela.
    const internalKey = process.env.INTERNAL_API_KEY
    if (!internalKey) throw new ServiceUnavailableException('Não foi possível conferir o card agora. Tente de novo.')
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/cards/in-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key': internalKey,
          'X-Tenant-Id': tenantId,
        },
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      this.logger.error(`fetchInTenant: sprint-service indisponível — ${error instanceof Error ? error.message : String(error)}`)
      throw new ServiceUnavailableException('Não foi possível conferir o card agora. Tente de novo.')
    }
    if (!res.ok) {
      this.logger.error(`fetchInTenant: sprint-service respondeu ${res.status}`)
      throw new ServiceUnavailableException('Não foi possível conferir o card agora. Tente de novo.')
    }
    const body = (await res.json().catch(() => ({}))) as { ids?: unknown }
    // Só vale id que foi pedido: uma resposta inesperada nunca libera card a mais.
    const pedidos = new Set(ids)
    return Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string' && pedidos.has(id)) : []
  }

  private remember(key: string, expiresAt: number): void {
    if (this.cache.size >= CACHE_MAX) {
      const now = Date.now()
      for (const [k, exp] of this.cache) if (exp <= now) this.cache.delete(k)
      if (this.cache.size >= CACHE_MAX) this.cache.clear()
    }
    this.cache.set(key, expiresAt)
  }
}
