import { describe, it, expect } from 'vitest'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_EXT_BY_MIME,
  LINK_ATTACHMENT_TYPE,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_MB,
  MAX_LINK_URL_LENGTH,
  erroDoAnexo,
  extensaoDe,
  isLinkAttachment,
  linkHost,
  linkHref,
  linkThumbnail,
  tipoDoAnexo,
  youtubeVideoId,
} from '@/lib/attachmentTypes'
import * as fileService from '../../../file-service/src/upload/attachment-types'
import * as mcp from '../../../mcp-server/src/attachmentTypes'

describe('paridade entre app, file-service e MCP', () => {
  it('os três aceitam exatamente os mesmos tipos, com as mesmas extensões', () => {
    expect(ATTACHMENT_EXT_BY_MIME).toEqual(fileService.ATTACHMENT_EXT_BY_MIME)
    expect(ATTACHMENT_EXT_BY_MIME).toEqual(mcp.ATTACHMENT_EXT_BY_MIME)
  })

  it('o limite de tamanho é o mesmo nos três', () => {
    expect(MAX_ATTACHMENT_MB).toBe(fileService.MAX_ATTACHMENT_MB)
    expect(MAX_ATTACHMENT_BYTES).toBe(fileService.MAX_ATTACHMENT_SIZE)
    expect(MAX_ATTACHMENT_BYTES).toBe(mcp.MAX_ATTACHMENT_BYTES)
  })

  it('o tipo e o limite do anexo de link são os mesmos nos três', () => {
    expect(fileService.LINK_ATTACHMENT_TYPE).toBe(LINK_ATTACHMENT_TYPE)
    expect(mcp.LINK_ATTACHMENT_TYPE).toBe(LINK_ATTACHMENT_TYPE)
    expect(fileService.MAX_LINK_URL_LENGTH).toBe(MAX_LINK_URL_LENGTH)
    expect(mcp.MAX_LINK_URL_LENGTH).toBe(MAX_LINK_URL_LENGTH)
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

describe('anexo de link', () => {
  it('reconhece o tipo', () => {
    expect(isLinkAttachment('text/uri-list')).toBe(true)
    expect(isLinkAttachment('image/png')).toBe(false)
  })

  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://vimeo.com/123456', null],
    ['https://www.youtube.com/watch?v=curto', null],
    ['https://evil.com/watch?v=dQw4w9WgXcQ', null],
    ['https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', null],
    ['não é url', null],
  ])('youtubeVideoId(%s) = %s, igual no MCP', (url, id) => {
    expect(youtubeVideoId(url)).toBe(id)
    expect(mcp.youtubeVideoId(url)).toBe(id)
  })

  it('miniatura só para YouTube', () => {
    expect(linkThumbnail('https://youtu.be/dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg')
    expect(linkThumbnail('https://vimeo.com/123456')).toBeNull()
  })

  it('linkHref só devolve http(s): nada de javascript: num href', () => {
    expect(linkHref('https://vimeo.com/123')).toBe('https://vimeo.com/123')
    expect(linkHref('http://exemplo.com/a')).toBe('http://exemplo.com/a')
    expect(linkHref('javascript:alert(1)')).toBeNull()
    expect(linkHref('data:text/html,<script>')).toBeNull()
    expect(linkHref('/relativo')).toBeNull()
  })

  it('linkHost tira o www', () => {
    expect(linkHost('https://www.youtube.com/watch?v=x')).toBe('youtube.com')
    expect(linkHost('lixo')).toBe('')
  })
})
