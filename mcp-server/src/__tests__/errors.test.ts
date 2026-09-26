import { describe, it, expect } from 'vitest'
import { toToolError } from '../errors'

function withStatus(status: number, message = 'erro') {
  const err = new Error(message) as Error & { status?: number }
  err.status = status
  return err
}

describe('toToolError', () => {
  it('401 -> mensagem de token inválido/revogado', () => {
    const result = toToolError(withStatus(401))
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/inválido ou revogado/)
  })

  it('403 -> mensagem de escopo somente leitura', () => {
    const result = toToolError(withStatus(403))
    expect(result.content[0].text).toMatch(/escopo read/)
  })

  it('404 -> menciona a entidade informada', () => {
    const result = toToolError(withStatus(404), 'Card')
    expect(result.content[0].text).toMatch(/^Card não encontrado/)
  })

  it('404 sem entidade -> usa fallback genérico', () => {
    const result = toToolError(withStatus(404))
    expect(result.content[0].text).toMatch(/^Recurso não encontrado/)
  })

  it('400/422 -> repassa a mensagem original', () => {
    expect(toToolError(withStatus(400, 'campo obrigatório')).content[0].text).toBe('campo obrigatório')
    expect(toToolError(withStatus(422, 'validação falhou')).content[0].text).toBe('validação falhou')
  })

  it('5xx ou erro sem status -> indisponibilidade genérica', () => {
    expect(toToolError(withStatus(500)).content[0].text).toMatch(/indisponível/)
    expect(toToolError(new Error('timeout')).content[0].text).toMatch(/indisponível/)
  })

  it('nunca vaza stack trace ou detalhes internos', () => {
    const err = withStatus(500, 'connect ECONNREFUSED 10.0.0.5:4000')
    const result = toToolError(err)
    expect(result.content[0].text).not.toContain('10.0.0.5')
    expect(result.content[0].text).not.toContain('ECONNREFUSED')
  })
})
