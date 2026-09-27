import { describe, it, expect } from 'vitest'
import { toToolError, UserError } from '../errors'

function withStatus(status: number, message = 'erro', publicMessage?: string) {
  const err = new Error(message) as Error & { status?: number; publicMessage?: string }
  err.status = status
  err.publicMessage = publicMessage
  return err
}

describe('toToolError', () => {
  it('401 -> mensagem de token inválido/revogado', () => {
    const result = toToolError(withStatus(401))
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/inválido ou revogado/)
  })

  it('403 sem mensagem de negócio -> menciona escopo read', () => {
    expect(toToolError(withStatus(403)).content[0].text).toMatch(/escopo read/)
  })

  it('403 com mensagem de negócio do serviço -> repassa', () => {
    expect(toToolError(withStatus(403, 'x', 'Sem permissão para editar')).content[0].text).toBe('Sem permissão: Sem permissão para editar')
  })

  it('404 -> menciona a entidade informada', () => {
    expect(toToolError(withStatus(404), 'Tarefa').content[0].text).toBe('Não encontrado neste tenant: Tarefa.')
    expect(toToolError(withStatus(404)).content[0].text).toBe('Não encontrado neste tenant: recurso.')
  })

  it('400/409/422 -> repassa só a mensagem pública (vinda de corpo JSON)', () => {
    expect(toToolError(withStatus(400, 'x', 'campo obrigatório')).content[0].text).toBe('campo obrigatório')
    expect(toToolError(withStatus(409, 'x', 'Projeto com esse nome já existe')).content[0].text).toBe('Projeto com esse nome já existe')
    expect(toToolError(withStatus(422, 'x', 'validação falhou')).content[0].text).toBe('validação falhou')
  })

  it('400 sem mensagem pública (ex.: HTML de proxy) -> genérico, sem vazar o corpo', () => {
    const result = toToolError(withStatus(400, '<html>nginx internal 10.0.0.5</html>'))
    expect(result.content[0].text).toBe('Dados inválidos.')
  })

  it('UserError -> mensagem vai direto ao modelo', () => {
    expect(toToolError(new UserError('Informe project_id.')).content[0].text).toBe('Informe project_id.')
  })

  it('429 -> orienta a aguardar', () => {
    expect(toToolError(withStatus(429)).content[0].text).toMatch(/aguarde/)
  })

  it('5xx ou erro sem status -> indisponibilidade genérica, sem detalhes internos', () => {
    const result = toToolError(withStatus(500, 'connect ECONNREFUSED 10.0.0.5:4000'))
    expect(result.content[0].text).toMatch(/indisponível/)
    expect(result.content[0].text).not.toContain('10.0.0.5')
    expect(toToolError(new Error('timeout')).content[0].text).toMatch(/indisponível/)
  })
})
