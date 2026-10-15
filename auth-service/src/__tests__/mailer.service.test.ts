// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger } from '@nestjs/common'

const sendMail = vi.fn()
const verify = vi.fn()
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail, verify })) } }))

import { MailerService, mascararEmail, smtpConfigurado } from '../mailer/mailer.service'

const SMTP = { SMTP_HOST: 'smtp.exemplo.com', SMTP_PORT: '587', SMTP_USER: 'u', SMTP_PASSWORD: 'p' }
const original = { ...process.env }

let erros: string[]
let avisos: string[]
beforeEach(() => {
  vi.clearAllMocks()
  for (const k of Object.keys(SMTP)) delete process.env[k]
  erros = []; avisos = []
  vi.spyOn(Logger.prototype, 'error').mockImplementation((m: unknown) => { erros.push(String(m)) })
  vi.spyOn(Logger.prototype, 'warn').mockImplementation((m: unknown) => { avisos.push(String(m)) })
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
})
afterEach(() => { process.env = { ...original }; vi.restoreAllMocks() })

describe('MailerService', () => {
  it('em produção sem SMTP: não envia, não registra o código e avisa com o e-mail mascarado', async () => {
    process.env.NODE_ENV = 'production'
    await new MailerService().sendPasswordResetCode('vinicius.mota@mavellium.com.br', 'AB12CD34', 'Fábio')
    expect(sendMail).not.toHaveBeenCalled()
    expect(erros.join('\n')).toContain('SMTP não configurado')
    expect(erros.join('\n')).toContain('vi***@mavellium.com.br')
    expect([...erros, ...avisos].join('\n')).not.toContain('AB12CD34')
    expect([...erros, ...avisos].join('\n')).not.toContain('vinicius.mota@')
  })

  it('em desenvolvimento sem SMTP: mostra o código no log para testar', async () => {
    process.env.NODE_ENV = 'development'
    await new MailerService().sendPasswordResetCode('a@b.com', 'AB12CD34', 'T')
    expect(avisos.join('\n')).toContain('AB12CD34')
  })

  it('com SMTP: envia o e-mail com o código; falha de envio só vai para o log, mascarada', async () => {
    Object.assign(process.env, SMTP, { NODE_ENV: 'production' })
    await new MailerService().sendPasswordResetCode('vinicius.mota@mavellium.com.br', 'AB12CD34', 'Fábio')
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'vinicius.mota@mavellium.com.br', html: expect.stringContaining('AB12CD34') }))

    sendMail.mockRejectedValueOnce(new Error('535 auth failed'))
    await expect(new MailerService().sendPasswordResetCode('vinicius.mota@mavellium.com.br', 'X', 'Fábio')).resolves.toBeUndefined()
    expect(erros.at(-1)).toMatch(/Falha ao enviar.*vi\*\*\*@mavellium\.com\.br.*535 auth failed/)
  })

  it('na subida: erro claro em produção sem SMTP; com SMTP, testa a conexão sem derrubar o serviço', async () => {
    process.env.NODE_ENV = 'production'
    await new MailerService().onModuleInit()
    expect(erros.at(-1)).toContain('NÃO será enviado')

    Object.assign(process.env, SMTP)
    verify.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    await expect(new MailerService().onModuleInit()).resolves.toBeUndefined()
    expect(erros.at(-1)).toMatch(/conexão falhou.*ECONNREFUSED/)
  })

  it('helpers', () => {
    expect(mascararEmail('ab@x.com')).toBe('ab***@x.com')
    expect(mascararEmail('sem-arroba')).toBe('***')
    expect(smtpConfigurado({ ...SMTP })).toBe(true)
    expect(smtpConfigurado({ SMTP_HOST: 'h' })).toBe(false)
  })
})
