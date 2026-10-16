/** Mesmo limite do sprint-service (`src/time-entry/regras-tempo.ts`, ADR-046). */
export const LIMITE_TIMER_HORAS = 12
/** A partir daqui a tela pergunta se o timer foi esquecido ligado. */
export const AVISO_TIMER_HORAS = 8

/** Mensagem para a sessão atual do timer, ou null se ainda está dentro do normal. */
export function avisoTimerLongo(startedAt: string | Date | null | undefined, agora: Date): string | null {
  if (!startedAt) return null
  const horas = (agora.getTime() - new Date(startedAt).getTime()) / 3600_000
  if (!(horas >= AVISO_TIMER_HORAS)) return null
  return `Timer ligado há ${Math.floor(horas)} h. Se você esqueceu, pause e corrija o tempo; ele para sozinho em ${LIMITE_TIMER_HORAS} h.`
}
