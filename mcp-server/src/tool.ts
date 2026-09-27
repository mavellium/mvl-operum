import { z, type ZodRawShape } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { TenantContext, TenantRegistry } from './tenants.js'
import { jsonResult } from './result.js'
import { toToolError, UserError } from './errors.js'

export const tenantIdShape = {
  tenant_id: z
    .string()
    .optional()
    .describe('Tenant alvo (ver operum_list_tenants). Omitido = tenant do token padrão (header Authorization).'),
}

export const confirmShape = {
  confirm: z.boolean().optional().describe('Obrigatório true: operação destrutiva.'),
}

export function requireConfirm(confirm: boolean | undefined, what: string): void {
  if (confirm !== true) {
    throw new UserError(`${what} é destrutivo. Confirme com o usuário e chame de novo com confirm: true.`)
  }
}

/** Contexto extra repassado pelo SDK (progress token, sinal de cancelamento, envio de notificações). */
export interface ToolExtra {
  signal?: AbortSignal
  _meta?: { progressToken?: string | number }
  sendNotification?: (n: { method: 'notifications/progress'; params: Record<string, unknown> }) => Promise<void>
}

export type ProgressFn = (progress: number, total: number | undefined, message: string) => void

export function progressReporter(extra: ToolExtra | undefined): ProgressFn {
  const token = extra?._meta?.progressToken
  if (token === undefined || !extra?.sendNotification) return () => {}
  return (progress, total, message) => {
    extra
      .sendNotification!({ method: 'notifications/progress', params: { progressToken: token, progress, total, message } })
      .catch(() => {})
  }
}

interface ToolDef<S extends ZodRawShape> {
  title: string
  description: string
  inputSchema: S
  /** Entidade para a mensagem de 404 ("Tarefa não encontrada neste tenant."). */
  entity: string
  annotations: ToolAnnotations
}

type Args<S extends ZodRawShape> = z.infer<z.ZodObject<S>> & { tenant_id?: string }

/**
 * Registra uma tool com o contrato comum a todas: `tenant_id` opcional,
 * resolução do tenant pelo registry, saída JSON e erros acionáveis.
 */
export function defineTool<S extends ZodRawShape>(
  server: McpServer,
  registry: TenantRegistry,
  name: string,
  def: ToolDef<S>,
  run: (args: Args<S>, ctx: TenantContext, extra: ToolExtra) => Promise<Record<string, unknown>>,
): void {
  const inputSchema = { ...tenantIdShape, ...def.inputSchema }
  server.registerTool(
    name,
    {
      title: def.title,
      description: def.description,
      inputSchema,
      annotations: { openWorldHint: false, ...def.annotations },
    },
    (async (args: Args<S>, extra: ToolExtra) => {
      try {
        const ctx = await registry.resolve(args.tenant_id)
        const data = await run(args, ctx, extra)
        return jsonResult({ tenant_id: ctx.tenantId, ...data })
      } catch (err) {
        return toToolError(err, def.entity)
      }
    }) as never,
  )
}

/**
 * Registra no AuditLog do Operum a escrita feita pelo agente. O sprint-service
 * acrescenta authType/apiTokenId a partir dos headers do gateway (não
 * forjáveis), então a autoria "via PAT/MCP" é confiável. Best-effort: falha de
 * auditoria nunca falha a operação já executada.
 */
export async function audit(
  ctx: TenantContext,
  tool: string,
  action: string,
  entity: string,
  entityId: string | null | undefined,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await ctx.gw.post('/audit', { action, entity, entityId: entityId ?? undefined, details: { via: 'mcp', tool, ...details } })
  } catch (err) {
    console.error('[mcp-server] falha ao auditar escrita', { tool, entity, status: (err as { status?: number })?.status })
  }
}
