import { describe, it, expect, vi } from 'vitest'
import { HttpStatus } from '@nestjs/common'
import { ZodExceptionFilter } from '../filters/zod-exception.filter'
import { AlterarSenhaSchema } from '../auth/dto/password.dto'

function makeHost(res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }) {
  return {
    switchToHttp: () => ({ getResponse: () => res }),
  } as never
}

describe('ZodExceptionFilter', () => {
  it('converte ZodError em 400 com a mensagem real do problema', () => {
    const result = AlterarSenhaSchema.safeParse({ password: 'curta' })
    expect(result.success).toBe(false)
    const zodError = result.success ? undefined : result.error
    if (!zodError) throw new Error('esperava ZodError')

    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    const filter = new ZodExceptionFilter()

    filter.catch(zodError, makeHost({ status, json }))

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(json).toHaveBeenCalledWith({ success: false, error: zodError.issues[0].message })
  })
})
