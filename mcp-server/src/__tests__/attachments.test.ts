import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupHarness, type Harness } from './harness'
import { UserError } from '../errors'
import type { Downloader } from '../download'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

/** URL com usuário e senha, montada aqui para não ficar literal no código (o TruffleHog acusaria). */
function comCredenciais(url: string): string {
  const u = new URL(url)
  u.username = 'usuario'
  u.password = 'teste'
  return u.toString()
}

let h: Harness
let download: ReturnType<typeof vi.fn<Downloader>>
let taskId: string
let taskFabio: string

beforeEach(async () => {
  download = vi.fn<Downloader>()
  h = await setupHarness({ download })
  const mav = h.op.gateway('u-vini-mav')
  const project = await mav.post<Record<string, string>>('/projects', { name: 'Operum' })
  taskId = (await mav.post<Record<string, string>>('/cards', { projectId: project.id, title: 'EAP' })).id
  const fab = h.op.gateway('u-vini-fab')
  const projectFab = await fab.post<Record<string, string>>('/projects', { name: 'Do Fábio' })
  taskFabio = (await fab.post<Record<string, string>>('/cards', { projectId: projectFab.id, title: 'Gantt' })).id
})

describe('as tools aparecem no MCP', () => {
  it('upload, link e exclusão de anexo estão na lista', async () => {
    const names = (await h.client.listTools()).tools.map(t => t.name)
    expect(names).toEqual(expect.arrayContaining(['operum_upload_attachment', 'operum_add_link', 'operum_delete_attachment']))
  })
})

describe('operum_upload_attachment', () => {
  it('anexa a imagem enviada em base64 e audita', async () => {
    const res = await h.call('operum_upload_attachment', { task_id: taskId, file_name: 'eap.png', content_base64: PNG.toString('base64') })
    expect(res.attachment).toMatchObject({ kind: 'file', file_name: 'eap.png', file_type: 'image/png', file_size: PNG.length })
    expect(res.attachment).not.toHaveProperty('url')
    const [att] = h.op.attachments
    expect(att.cardId).toBe(taskId)
    expect(h.op.attachmentBytes.get(att.id)).toEqual(PNG)
    expect(h.op.audit.at(-1)).toMatchObject({
      action: 'CREATE', entity: 'attachment', entityId: att.id,
      details: { via: 'mcp', tool: 'operum_upload_attachment', cardId: taskId, source: 'base64' },
    })
  })

  it('aceita data: URL, completa a extensão e limpa caracteres que o file-service recusa', async () => {
    const res = await h.call('operum_upload_attachment', {
      task_id: taskId,
      file_name: 'EAP: versão 2',
      content_base64: `data:image/png;base64,${PNG.toString('base64')}`,
    })
    expect(res.attachment).toMatchObject({ file_name: 'EAP- versão 2.png', file_type: 'image/png' })
  })

  it('baixa pela url (até 50 MB) e usa o nome do fim da URL', async () => {
    download.mockResolvedValue({ bytes: Buffer.from('mp4'), contentType: 'video/mp4', fileName: 'aula-eap.mp4' })
    const res = await h.call('operum_upload_attachment', { task_id: taskId, url: 'https://exemplo.com/videos/aula-eap.mp4' })
    expect(download).toHaveBeenCalledWith('https://exemplo.com/videos/aula-eap.mp4', { maxBytes: 50 * 1024 * 1024 })
    expect(res.attachment).toMatchObject({ file_name: 'aula-eap.mp4', file_type: 'video/mp4' })
  })

  it('erro do download (ex.: endereço interno) chega ao modelo', async () => {
    download.mockRejectedValue(new UserError('URL recusada: o endereço não é público. Use uma URL HTTPS acessível pela internet.'))
    const res = await h.raw('operum_upload_attachment', { task_id: taskId, url: 'https://169.254.169.254/' })
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toMatch(/não é público/)
    expect(h.op.attachments).toHaveLength(0)
  })

  it('tipo não suportado: explica o que é aceito e não envia nada', async () => {
    const res = await h.raw('operum_upload_attachment', { task_id: taskId, file_name: 'setup.exe', content_base64: PNG.toString('base64') })
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toMatch(/^Tipo de arquivo não suportado \(\.exe\)\. Aceitos: imagens/)
    expect(res.content[0].text).toMatch(/operum_add_link/)
    expect(h.op.attachments).toHaveLength(0)
  })

  it('base64 acima de 10 MB: diz o limite e sugere url', async () => {
    const grande = 'A'.repeat(Math.ceil((10 * 1024 * 1024 * 4) / 3) + 8)
    const res = await h.raw('operum_upload_attachment', { task_id: taskId, file_name: 'grande.mp4', content_base64: grande })
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toMatch(/limite de 10 MB.*use url/)
  })

  it.each([
    [{ file_name: 'a.png', content_base64: 'não é base64!' }, /não é base64 válido/],
    [{ file_name: 'a.png', content_base64: '' }, /vazio/],
    [{ content_base64: PNG.toString('base64') }, /file_name é obrigatório/],
    [{}, /content_base64 ou url/],
    [{ file_name: 'a.png', content_base64: 'AA==', url: 'https://exemplo.com/a.png' }, /content_base64 ou url/],
  ])('entrada inválida %#', async (args, erro) => {
    const res = await h.raw('operum_upload_attachment', { task_id: taskId, ...args })
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toMatch(erro)
  })

  it('tarefa de outro tenant: recusa sem gravar (o file-service não confere tenant)', async () => {
    const res = await h.raw('operum_upload_attachment', { task_id: taskFabio, file_name: 'eap.png', content_base64: PNG.toString('base64') })
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toBe('Não encontrado neste tenant: Tarefa.')
    expect(h.op.attachments).toHaveLength(0)
  })

  it('task_id com caminho (../) é recusado pelo schema', async () => {
    const res = await h.raw('operum_upload_attachment', { task_id: '../files/by-cards', file_name: 'a.png', content_base64: 'AA==' })
    expect(res.isError).toBe(true)
    expect(h.op.calls.some(c => c.path.startsWith('/files'))).toBe(false)
  })
})

describe('operum_add_link', () => {
  it('anexa o vídeo do YouTube com título padrão e não duplica', async () => {
    const first = await h.call('operum_add_link', { task_id: taskId, url: YOUTUBE })
    expect(first).toMatchObject({
      already_attached: false,
      attachment: { kind: 'link', url: YOUTUBE, file_name: 'Vídeo do YouTube (dQw4w9WgXcQ)', file_type: 'text/uri-list' },
    })
    const again = await h.call('operum_add_link', { task_id: taskId, url: YOUTUBE, title: 'Outro título' })
    expect(again.already_attached).toBe(true)
    expect(h.op.attachments).toHaveLength(1)
    expect(h.op.audit.filter(a => a.entity === 'attachment')).toHaveLength(1)
  })

  it('usa o título informado e aceita links que não são de vídeo', async () => {
    const res = await h.call('operum_add_link', { task_id: taskId, url: 'https://vimeo.com/123456', title: 'Aula 2: Gantt' })
    expect(res.attachment).toMatchObject({ kind: 'link', file_name: 'Aula 2: Gantt', url: 'https://vimeo.com/123456' })
  })

  it.each(['javascript:alert(1)', 'ftp://exemplo.com/a', comCredenciais('https://exemplo.com/'), 'nada'])('recusa %s', async url => {
    const res = await h.raw('operum_add_link', { task_id: taskId, url })
    expect(res.isError).toBe(true)
    expect(h.op.attachments).toHaveLength(0)
  })

  it('tarefa de outro tenant: recusa sem gravar', async () => {
    const res = await h.raw('operum_add_link', { task_id: taskFabio, url: YOUTUBE })
    expect(res.content[0].text).toBe('Não encontrado neste tenant: Tarefa.')
    expect(h.op.attachments).toHaveLength(0)
  })
})

describe('operum_delete_attachment', () => {
  it('exige confirm e exclui o anexo da tarefa', async () => {
    const { attachment } = await h.call('operum_add_link', { task_id: taskId, url: YOUTUBE }) as { attachment: { id: string } }

    const semConfirm = await h.raw('operum_delete_attachment', { task_id: taskId, attachment_id: attachment.id })
    expect(semConfirm.content[0].text).toMatch(/confirm: true/)

    const res = await h.call('operum_delete_attachment', { task_id: taskId, attachment_id: attachment.id, confirm: true })
    expect(res).toMatchObject({ deleted: true, attachment: { id: attachment.id, kind: 'link' } })
    expect(h.op.attachments[0].deletedAt).toBeTruthy()
    expect(h.op.audit.at(-1)).toMatchObject({ action: 'DELETE', entity: 'attachment', entityId: attachment.id })
  })

  it('anexo de outra tarefa não é excluído por esta', async () => {
    const mav = h.op.gateway('u-vini-mav')
    const outra = await mav.post<Record<string, string>>('/cards', { projectId: h.op.projects[0].id, title: 'Outra' })
    const { attachment } = await h.call('operum_add_link', { task_id: outra.id, url: YOUTUBE }) as { attachment: { id: string } }

    const res = await h.raw('operum_delete_attachment', { task_id: taskId, attachment_id: attachment.id, confirm: true })
    expect(res.content[0].text).toMatch(/Anexo não encontrado nesta tarefa/)
    expect(h.op.attachments[0].deletedAt).toBeNull()
  })
})

describe('leitura dos anexos (vêm do file-service)', () => {
  beforeEach(async () => {
    await h.call('operum_upload_attachment', { task_id: taskId, file_name: 'eap.png', content_base64: PNG.toString('base64') })
    await h.call('operum_add_link', { task_id: taskId, url: YOUTUBE })
  })

  it('get_task traz arquivo (com download_url assinada) e link (com url)', async () => {
    const res = await h.call('operum_get_task', { task_id: taskId })
    const atts = (res.task as { attachments: Record<string, unknown>[] }).attachments
    expect(atts.map(a => a.kind)).toEqual(['file', 'link'])
    expect(atts[0].download_url).toMatch(/^https:\/\/storage\.test\/.*X-Amz-Signature=/)
    expect(atts[1]).toMatchObject({ url: YOUTUBE })
    expect(atts[1]).not.toHaveProperty('download_url')
    expect(res).not.toHaveProperty('attachments_error')
    // A URL é pedida com o cardId, para o file-service conferir que o anexo é da tarefa.
    expect(h.op.calls.find(c => c.path.endsWith('/url'))).toBeTruthy()
  })

  it('se assinar a URL falhar, o anexo sai sem download_url e o get_task responde', async () => {
    h.op.failWhen = (_m, path) => (path.endsWith('/url') ? Object.assign(new Error('x'), { status: 500 }) : null)
    const res = await h.call('operum_get_task', { task_id: taskId })
    const atts = (res.task as { attachments: Record<string, unknown>[] }).attachments
    expect(atts).toHaveLength(2)
    expect(atts[0]).not.toHaveProperty('download_url')
  })

  it('list_tasks full traz os anexos; summary não', async () => {
    const project_id = h.op.projects[0].id
    const full = await h.call('operum_list_tasks', { project_id, fields: 'full' })
    const item = (full.items as { id: string; attachments: unknown[] }[]).find(t => t.id === taskId)!
    expect(item.attachments).toHaveLength(2)
    const summary = await h.call('operum_list_tasks', { project_id })
    expect((summary.items as Record<string, unknown>[])[0]).not.toHaveProperty('attachments')
  })

  it('list_tasks full busca anexos exclusivamente dos IDs da página', async () => {
    const project_id = h.op.projects[0].id
    await h.call('operum_create_task', { project_id, title: 'Outro card' })
    h.op.calls.length = 0
    const page = await h.call('operum_list_tasks', { project_id, fields: 'full', limit: 1 })
    const ids = (page.items as { id: string }[]).map(card => card.id)
    expect(ids).toHaveLength(1)
    const files = h.op.calls.filter(call => call.path === '/files/by-cards')
    expect(files).toHaveLength(1)
    expect(files[0].query?.cardIds).toBe(ids.join(','))
    expect(h.op.calls.some(call => call.path === '/cards/backlog')).toBe(false)
  })

  it('se o file-service falhar, get_task responde sem anexos e avisa', async () => {
    h.op.failWhen = (_m, path) => (path === '/files/by-cards' ? Object.assign(new Error('boom'), { status: 500 }) : null)
    const res = await h.call('operum_get_task', { task_id: taskId })
    expect((res.task as { attachments: unknown[] }).attachments).toEqual([])
    expect(res.attachments_error).toMatch(/anexos/)
  })
})
