import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TenantContext, TenantRegistry } from '../tenants.js'
import type { Gateway } from '../gateway.js'
import { audit, confirmShape, defineTool, idSchema, requireConfirm } from '../tool.js'
import { serializeAttachment } from '../serializers.js'
import { UserError } from '../errors.js'
import { safeDownload, type Downloader } from '../download.js'
import {
  ACCEPTED_TYPES_LABEL,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_MB,
  MAX_BASE64_BYTES,
  MAX_BASE64_MB,
  MAX_LINK_URL_LENGTH,
  extOf,
  resolveMime,
  safeFileName,
  youtubeVideoId,
} from '../attachmentTypes.js'

export type RawAttachment = Record<string, unknown> & { id: string; cardId: string }

export interface AttachmentDeps {
  download: Downloader
}

export const defaultAttachmentDeps: AttachmentDeps = { download: safeDownload }

const BY_CARDS_BATCH = 100

/** Anexos de vários cards, pelo file-service (o sprint-service não os inclui nos cards). */
export async function fetchAttachments(gw: Gateway, cardIds: string[]): Promise<Map<string, RawAttachment[]>> {
  const byCard = new Map<string, RawAttachment[]>()
  const ids = [...new Set(cardIds)]
  for (let i = 0; i < ids.length; i += BY_CARDS_BATCH) {
    const rows = await gw.get<RawAttachment[]>('/files/by-cards', { cardIds: ids.slice(i, i + BY_CARDS_BATCH).join(',') })
    for (const row of rows) byCard.set(row.cardId, [...(byCard.get(row.cardId) ?? []), row])
  }
  return byCard
}

/**
 * Confere que a tarefa é do tenant do token. O file-service confia no chamador
 * e não sabe de tenant: sem isto, um task_id de outro tenant receberia o anexo.
 */
async function assertTask(ctx: TenantContext, taskId: string): Promise<void> {
  await ctx.gw.get(`/cards/${taskId}`)
}

function decodeBase64(input: string): { bytes: Buffer; mime: string | undefined } {
  let data = input.trim()
  let mime: string | undefined
  const dataUrl = data.match(/^data:([^;,]*)((?:;[^;,]*)*);base64,/i)
  if (dataUrl) {
    mime = dataUrl[1] || undefined
    data = data.slice(dataUrl[0].length)
  }
  data = data.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(data) || data.length % 4 === 1) {
    throw new UserError('content_base64 não é base64 válido.')
  }
  if (Math.floor((data.length * 3) / 4) > MAX_BASE64_BYTES + 2) {
    throw new UserError(`content_base64 passa do limite de ${MAX_BASE64_MB} MB. Para arquivos maiores (até ${MAX_ATTACHMENT_MB} MB), use url.`)
  }
  // O decoder "base64" do Node aceita também o alfabeto URL-safe (-_).
  return { bytes: Buffer.from(data, 'base64'), mime }
}

/** Valida o link a gravar. O servidor nunca acessa essa URL (sem risco de SSRF): só a guarda. */
function parseLinkUrl(raw: string): URL {
  const value = raw.trim()
  if (!value || value.length > MAX_LINK_URL_LENGTH) throw new UserError(`A URL deve ter entre 1 e ${MAX_LINK_URL_LENGTH} caracteres.`)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new UserError('URL inválida.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new UserError('O link deve começar com http:// ou https://.')
  if (url.username || url.password) throw new UserError('O link não pode conter usuário ou senha.')
  return url
}

function defaultLinkTitle(url: URL): string {
  const youtube = youtubeVideoId(url.toString())
  if (youtube) return `Vídeo do YouTube (${youtube})`
  return `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`
}

export function registerAttachmentTools(server: McpServer, registry: TenantRegistry, deps: AttachmentDeps = defaultAttachmentDeps) {
  defineTool(
    server,
    registry,
    'operum_upload_attachment',
    {
      title: 'Anexar arquivo à tarefa',
      description:
        `Anexa um arquivo à tarefa (card): imagem, vídeo, PDF ou documento. Envie o conteúdo em content_base64 (até ${MAX_BASE64_MB} MB) ` +
        `ou uma url HTTPS pública, que o servidor baixa (até ${MAX_ATTACHMENT_MB} MB). Tipos aceitos: ${ACCEPTED_TYPES_LABEL}. ` +
        'Para link de vídeo (YouTube, Vimeo etc.) sem baixar o arquivo, use operum_add_link.',
      inputSchema: {
        task_id: idSchema,
        file_name: z.string().max(255).optional().describe('Nome com extensão, ex.: eap.png. Obrigatório com content_base64; com url, o padrão é o nome no fim da URL.'),
        mime_type: z.string().optional().describe('Tipo MIME, ex.: image/png. Opcional: a extensão do nome tem precedência.'),
        content_base64: z.string().optional().describe('Conteúdo do arquivo em base64 (aceita data: URL).'),
        url: z.string().optional().describe('URL HTTPS pública do arquivo.'),
      },
      entity: 'Tarefa',
      annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args, ctx) => {
      const hasContent = args.content_base64 !== undefined
      if (hasContent === (args.url !== undefined)) throw new UserError('Informe content_base64 ou url (um dos dois).')
      if (hasContent && !args.file_name?.trim()) throw new UserError('file_name é obrigatório com content_base64 (ex.: eap.png).')

      await assertTask(ctx, args.task_id)

      let bytes: Buffer
      let name = args.file_name?.trim() ?? ''
      let sourceType: string | undefined
      if (hasContent) {
        const decoded = decodeBase64(args.content_base64!)
        bytes = decoded.bytes
        sourceType = decoded.mime
      } else {
        // safeDownload (download.ts) é a proteção contra SSRF: só HTTPS na 443 e
        // recusa, na hora da conexão, IPs privados, loopback, link-local
        // (metadados de nuvem) e reservados, inclusive após redirecionamento.
        const downloaded = await deps.download(args.url!, { maxBytes: MAX_ATTACHMENT_BYTES })
        bytes = downloaded.bytes
        sourceType = downloaded.contentType
        if (!name) name = downloaded.fileName ?? ''
      }
      if (bytes.length === 0) throw new UserError('O arquivo está vazio.')

      const mime = resolveMime(name, args.mime_type, sourceType)
      if (!mime) {
        const ext = extOf(name)
        throw new UserError(
          `Tipo de arquivo não suportado${ext ? ` (${ext})` : ''}. Aceitos: ${ACCEPTED_TYPES_LABEL}. ` +
            'Informe file_name com a extensão certa ou mime_type. Para link de vídeo, use operum_add_link.',
        )
      }
      const fileName = safeFileName(name, mime)

      const form = new FormData()
      form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), fileName)
      const attachment = await ctx.gw.upload<Record<string, unknown>>(`/files/upload?cardId=${args.task_id}`, form)
      await audit(ctx, 'operum_upload_attachment', 'CREATE', 'attachment', String(attachment.id), {
        cardId: args.task_id,
        fileName,
        fileType: mime,
        fileSize: bytes.length,
        source: hasContent ? 'base64' : 'url',
      })
      return { attachment: serializeAttachment(attachment) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_add_link',
    {
      title: 'Anexar link à tarefa',
      description:
        'Anexa um link à tarefa (card), sem baixar o arquivo: vídeo do YouTube, Vimeo, Loom, Google Drive etc. ' +
        'Aparece na lista de anexos do card; vídeo do YouTube ganha miniatura. O mesmo link na mesma tarefa não é duplicado.',
      inputSchema: {
        task_id: idSchema,
        url: z.string().describe('URL http(s) do vídeo ou da página.'),
        title: z.string().max(255).optional().describe('Texto do anexo. Padrão: "Vídeo do YouTube (<id>)" ou host + caminho.'),
      },
      entity: 'Tarefa',
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ task_id, url, title }, ctx) => {
      const link = parseLinkUrl(url)
      await assertTask(ctx, task_id)

      const existing = (await fetchAttachments(ctx.gw, [task_id])).get(task_id)?.find(a => a.filePath === link.toString())
      if (existing) return { attachment: serializeAttachment(existing), already_attached: true }

      const attachment = await ctx.gw.post<Record<string, unknown>>(`/files/link?cardId=${task_id}`, {
        url: link.toString(),
        title: title?.trim() || defaultLinkTitle(link),
      })
      await audit(ctx, 'operum_add_link', 'CREATE', 'attachment', String(attachment.id), { cardId: task_id, url: link.toString() })
      return { attachment: serializeAttachment(attachment), already_attached: false }
    },
  )

  defineTool(
    server,
    registry,
    'operum_delete_attachment',
    {
      title: 'Excluir anexo',
      description: 'Exclui um anexo (arquivo ou link) da tarefa. Os ids estão em operum_get_task (attachments). Exige confirm=true.',
      inputSchema: { task_id: idSchema, attachment_id: idSchema, ...confirmShape },
      entity: 'Tarefa',
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ task_id, attachment_id, confirm }, ctx) => {
      requireConfirm(confirm, 'Excluir o anexo')
      await assertTask(ctx, task_id)
      const attachment = (await fetchAttachments(ctx.gw, [task_id])).get(task_id)?.find(a => a.id === attachment_id)
      if (!attachment) throw new UserError('Anexo não encontrado nesta tarefa. Confira os ids em operum_get_task.')

      await ctx.gw.delete(`/files/${attachment_id}`)
      await audit(ctx, 'operum_delete_attachment', 'DELETE', 'attachment', attachment_id, {
        cardId: task_id,
        fileName: attachment.fileName,
      })
      return { deleted: true, attachment: serializeAttachment(attachment) }
    },
  )
}
