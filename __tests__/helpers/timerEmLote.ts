import type { Mock } from 'vitest'

type Leitura = (id: string) => Promise<unknown>

/**
 * Implementação de teste de `getCardsTimerAction` composta pelos mocks de
 * `getCardTimeAction` e `getActiveTimerAction`, para os testes seguirem
 * configurando o total e o timer ativo por card.
 */
export function timerEmLote(getTime: Mock | Leitura, getActive: Mock | Leitura) {
  return async (ids: string[]) => {
    const out: Record<string, unknown> = {}
    for (const id of ids) {
      const [t, a] = (await Promise.all([(getTime as Leitura)(id), (getActive as Leitura)(id)])) as [Record<string, unknown>, Record<string, unknown>]
      out[id] = 'error' in t ? { error: t.error } : 'error' in a ? { error: a.error } : { seconds: t.seconds, entry: a.entry ?? null }
    }
    return out
  }
}
