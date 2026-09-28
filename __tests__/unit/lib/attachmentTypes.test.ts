import { describe, it, expect } from 'vitest'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_EXT_BY_MIME,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_MB,
  erroDoAnexo,
  extensaoDe,
  tipoDoAnexo,
} from '@/lib/attachmentTypes'
import * as fileService from '../../../file-service/src/upload/attachment-types'

describe('paridade com o file-service', () => {
  it('app e file-service aceitam exatamente os mesmos tipos, com as mesmas extensões', () => {
    expect(ATTACHMENT_EXT_BY_MIME).toEqual(fileService.ATTACHMENT_EXT_BY_MIME)
  })

  it('o limite de tamanho é o mesmo nos dois', () => {
    expect(MAX_ATTACHMENT_MB).toBe(fileService.MAX_ATTACHMENT_MB)
    expect(MAX_ATTACHMENT_BYTES).toBe(fileService.MAX_ATTACHMENT_SIZE)
  })
})

describe('extensaoDe', () => {
  it.each([
    ['Foto.JPEG', '.jpeg'],
    ['relatorio.final.pdf', '.pdf'],
    ['sem-extensao', ''],
    ['.gitignore', ''],
  ])('%s → %s', (nome, ext) => {
    expect(extensaoDe(nome)).toBe(ext)
  })
})

describe('tipoDoAnexo', () => {
  it.each([
    ['clip.mp4', 'video/mp4', 'video/mp4'],
    ['tela.webm', 'video/webm', 'video/webm'],
    // navegador sem tipo para .mov (Linux) ou .csv trocado pelo Windows
    ['gravacao.mov', '', 'video/quicktime'],
    ['dados.csv', 'application/vnd.ms-excel', 'text/csv'],
    ['Foto.JPEG', 'image/jpeg', 'image/jpeg'],
    ['pacote.zip', 'application/x-zip-compressed', 'application/zip'],
    ['apresentacao.pptx', '', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    // sem extensão: vale o tipo informado, se for aceito
    ['imagem', 'image/png', 'image/png'],
  ])('%s (%s) → %s', (name, type, esperado) => {
    expect(tipoDoAnexo({ name, type })).toBe(esperado)
  })

  it.each([
    ['pagina.html', 'text/html'],
    ['logo.svg', 'image/svg+xml'],
    ['setup.exe', 'application/x-msdownload'],
    ['sem-extensao', ''],
    ['estranho', 'constructor'],
  ])('recusa %s (%s)', (name, type) => {
    expect(tipoDoAnexo({ name, type })).toBeNull()
  })
})

describe('erroDoAnexo', () => {
  it('aceita um vídeo dentro do limite', () => {
    expect(erroDoAnexo({ name: 'clip.mp4', type: 'video/mp4', size: MAX_ATTACHMENT_BYTES })).toBeNull()
  })

  it('recusa arquivo acima do limite dizendo o tamanho e o limite', () => {
    const erro = erroDoAnexo({ name: 'clip.mp4', type: 'video/mp4', size: MAX_ATTACHMENT_BYTES + 1024 * 1024 })
    expect(erro).toBe(`"clip.mp4" tem 51,0 MB. O limite é ${MAX_ATTACHMENT_MB} MB.`)
  })

  it('recusa tipo não aceito dizendo a extensão e o que é aceito', () => {
    const erro = erroDoAnexo({ name: 'setup.exe', type: 'application/x-msdownload', size: 10 })
    expect(erro).toMatch(/^Tipo de arquivo não aceito \(\.exe\)\. Envie imagens, vídeos/)
  })
})

describe('ATTACHMENT_ACCEPT', () => {
  it('inclui vídeos e documentos por MIME e por extensão, sem SVG nem HTML', () => {
    const itens = ATTACHMENT_ACCEPT.split(',')
    expect(itens).toEqual(expect.arrayContaining(['video/mp4', '.mov', '.pdf', '.jpeg', '.csv']))
    expect(itens).not.toContain('.svg')
    expect(itens).not.toContain('.html')
  })
})
