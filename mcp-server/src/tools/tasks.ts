import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TenantContext, TenantRegistry } from '../tenants.js'
import { audit, confirmShape, defineTool, requireConfirm } from '../tool.js'
import { paginate, paginationShape } from '../pagination.js'
import { serializeMovement, serializeAudit, serializeTask, serializeTag, serializeComment, type SerializedTask } from '../serializers.js'
import { dateInput, toIso } from '../dates.js'
import { UserError } from '../errors.js'
import { mapLimit } from '../concurrency.js'
import { withIdempotency } from '../idempotency.js'

export const PRIORITIES = ['baixa', 'media', 'alta'] as const
const READ_CONCURRENCY = 4
const MAX_BULK = 100

type RawCard = Record<string, unknown>
type RawSprint = Record<string, unknown> & { sprintColumns?: Record<string, unknown>[] }

/** Nomes de sprint/coluna para enriquecer tarefas vindas de endpoints que não os incluem. */
interface Labels {
  sprints: Map<string, string>
  columns: Map<string, string>
}

function labelsFrom(sprints: RawSprint[]): Labels {
  const labels: Labels = { sprints: new Map(), columns: new Map() }
  for (const s of sprints) {
    labels.sprints.set(String(s.id), String(s.name))
    for (const c of s.sprintColumns ?? []) labels.columns.set(String(c.id), String(c.title))
  }
  return labels
}

/**
 * Coleta as tarefas pedidas. Sem sprint_id/backlog, varre o projeto inteiro
 * (backlog + todas as sprints) — cards criados dentro de sprints podem não ter
 * projectId, então buscar só por projectId perderia tarefas.
 */
async function collectTasks(
  ctx: TenantContext,
  scope: { project_id?: string; sprint_id?: string; backlog?: boolean },
): Promise<{ cards: RawCard[]; labels: Labels }> {
  if (scope.sprint_id) {
    const [sprint, cards] = await Promise.all([
      ctx.gw.get<RawSprint>(`/sprints/${scope.sprint_id}`),
      ctx.gw.get<RawCard[]>(`/sprints/${scope.sprint_id}/cards`),
    ])
    return { cards, labels: labelsFrom([sprint]) }
  }
  if (!scope.project_id) throw new UserError('Informe project_id ou sprint_id.')

  const sprints = await ctx.gw.get<RawSprint[]>('/sprints', { projectId: scope.project_id })
  const labels = labelsFrom(sprints)
  const backlog = await ctx.gw.get<RawCard[]>('/cards/backlog', { projectId: scope.project_id })
  if (scope.backlog) return { cards: backlog, labels }

  const perSprint = await mapLimit(sprints, READ_CONCURRENCY, s => ctx.gw.get<RawCard[]>(`/sprints/${s.id}/cards`))
  return { cards: [...backlog, ...perSprint.flat()], labels }
}

function withLabels(task: SerializedTask, labels: Labels) {
  return {
    ...task,
    sprint_name: task.sprint_id ? (labels.sprints.get(task.sprint_id) ?? null) : null,
    column_title: task.column_id ? (labels.columns.get(task.column_id) ?? null) : null,
  }
}

function summarize(t: ReturnType<typeof withLabels>) {
  return {
    id: t.id,
    title: t.title,
    priority: t.priority,
    sprint_id: t.sprint_id,
    sprint_name: t.sprint_name,
    column_id: t.column_id,
    column_title: t.column_title,
    in_backlog: t.in_backlog,
    start_date: t.start_date,
    end_date: t.end_date,
    responsibles: t.responsibles.map(r => ({ id: r?.id, name: r?.name })),
    tags: t.tags.map(g => g.name),
  }
}

async function firstColumnId(ctx: TenantContext, sprintId: string): Promise<string> {
  const cols = await ctx.gw.get<Record<string, unknown>[]>(`/sprints/${sprintId}/columns`)
  const first = [...cols].sort((a, b) => Number(a.position) - Number(b.position))[0]
  if (!first) throw new UserError('A sprint não tem colunas — crie uma com operum_create_column.')
  return String(first.id)
}

async function nextSprintPosition(ctx: TenantContext, sprintId: string, columnId: string): Promise<number> {
  const cards = await ctx.gw.get<RawCard[]>(`/sprints/${sprintId}/cards`)
  return cards.filter(c => c.sprintColumnId === columnId).length
}

const taskFieldsShape = {
  title: z.string().min(1).optional(),
  description: z.string().optional().describe('Markdown.'),
  priority: z.enum(PRIORITIES).optional(),
  color: z.string().optional().describe('Cor do card, ex.: #3b82f6.'),
  start_date: dateInput.optional(),
  end_date: dateInput.optional().describe('Prazo da tarefa (ISO 8601).'),
}

type TaskFields = { [K in keyof typeof taskFieldsShape]?: z.infer<(typeof taskFieldsShape)[K]> }

function toCardBody(f: TaskFields): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: f.title,
    description: f.description,
    priority: f.priority,
    color: f.color,
    startDate: toIso(f.start_date, 'start_date'),
    endDate: toIso(f.end_date, 'end_date'),
  }
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
}

/** Aplica a diferença entre o conjunto atual e o desejado de tags/responsáveis. */
async function syncSet(
  ctx: TenantContext,
  taskId: string,
  kind: 'tags' | 'responsibles',
  current: string[],
  desired: string[],
): Promise<{ added: string[]; removed: string[]; failed: { id: string; message: string }[] }> {
  const toAdd = desired.filter(id => !current.includes(id))
  const toRemove = current.filter(id => !desired.includes(id))
  const failed: { id: string; message: string }[] = []
  const added: string[] = []
  const removed: string[] = []
  for (const id of toAdd) {
    try {
      await ctx.gw.post(`/cards/${taskId}/${kind}/${id}`)
      added.push(id)
    } catch (err) {
      failed.push({ id, message: (err as { status?: number }).status === 404 ? 'não encontrado neste tenant' : 'falha ao adicionar' })
    }
  }
  for (const id of toRemove) {
    try {
      await ctx.gw.delete(`/cards/${taskId}/${kind}/${id}`)
      removed.push(id)
    } catch {
      failed.push({ id, message: 'falha ao remover' })
    }
  }
  return { added, removed, failed }
}

export function registerTaskTools(server: McpServer, registry: TenantRegistry) {
  defineTool(
    server,
    registry,
    'operum_list_tasks',
    {
      title: 'Listar tarefas',
      description:
        'Tarefas (cards) de um projeto ou sprint, com filtros. Sem sprint_id nem backlog, lista o projeto inteiro (backlog + todas as sprints). fields="summary" (padrão) traz os campos principais; "full" traz tudo, inclusive descrição e anexos.',
      inputSchema: {
        project_id: z.string().optional(),
        sprint_id: z.string().optional(),
        backlog: z.boolean().optional().describe('Só as tarefas do backlog do projeto (fora de sprint).'),
        column_id: z.string().optional(),
        responsible_id: z.string().optional(),
        priority: z.enum(PRIORITIES).optional(),
        due_before: dateInput.optional().describe('Prazo (end_date) até esta data.'),
        due_after: dateInput.optional().describe('Prazo (end_date) a partir desta data.'),
        q: z.string().optional().describe('Busca em título e descrição (sem diferenciar maiúsculas).'),
        fields: z.enum(['summary', 'full']).optional(),
        ...paginationShape,
      },
      entity: 'Projeto ou sprint',
      annotations: { readOnlyHint: true },
    },
    async (args, ctx) => {
      const { cards, labels } = await collectTasks(ctx, args)
      const before = toIso(args.due_before, 'due_before')
      const after = toIso(args.due_after, 'due_after')
      const needle = args.q?.toLowerCase()

      let tasks = cards.map(c => withLabels(serializeTask(c)!, labels))
      tasks = tasks.filter(t => {
        if (args.column_id && t.column_id !== args.column_id) return false
        if (args.priority && t.priority !== args.priority) return false
        if (args.responsible_id && !t.responsibles.some(r => r?.id === args.responsible_id)) return false
        if (before && !(t.end_date && t.end_date <= before)) return false
        if (after && !(t.end_date && t.end_date >= after)) return false
        if (needle && !`${t.title ?? ''}\n${t.description ?? ''}`.toLowerCase().includes(needle)) return false
        return true
      })
      const page = paginate(tasks, args.cursor, args.limit)
      return { ...page, items: args.fields === 'full' ? page.items : page.items.map(summarize) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_get_task',
    {
      title: 'Detalhar tarefa',
      description:
        'Todos os campos da tarefa: título, descrição (markdown), prioridade, cor, projeto/sprint/coluna, datas, responsáveis, etiquetas, anexos (metadados) e comentários. include_history=true traz também as movimentações entre colunas.',
      inputSchema: { task_id: z.string(), include_history: z.boolean().optional() },
      entity: 'Tarefa',
      annotations: { readOnlyHint: true },
    },
    async ({ task_id, include_history }, ctx) => {
      const [card, movements] = await Promise.all([
        ctx.gw.get<RawCard>(`/cards/${task_id}`),
        include_history ? ctx.gw.get<Record<string, unknown>[]>(`/cards/${task_id}/movements`) : Promise.resolve(null),
      ])
      return {
        task: serializeTask(card, { comments: true }),
        ...(movements ? { history: movements.map(serializeMovement) } : {}),
      }
    },
  )

  defineTool(
    server,
    registry,
    'operum_create_task',
    {
      title: 'Criar tarefa',
      description:
        'Cria uma tarefa no backlog do projeto (project_id) ou numa sprint (sprint_id, opcionalmente column_id; padrão: primeira coluna). Aceita responsáveis e etiquetas. Use idempotency_key para poder repetir a chamada com segurança.',
      inputSchema: {
        project_id: z.string().optional(),
        sprint_id: z.string().optional(),
        column_id: z.string().optional(),
        ...taskFieldsShape,
        title: z.string().min(1),
        responsible_ids: z.array(z.string()).optional(),
        tag_ids: z.array(z.string()).optional(),
        idempotency_key: z.string().min(1).max(200).optional(),
      },
      entity: 'Projeto, sprint ou coluna',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args, ctx) => {
      if (!args.project_id && !args.sprint_id) throw new UserError('Informe project_id (backlog) ou sprint_id.')
      if (args.column_id && !args.sprint_id) throw new UserError('column_id exige sprint_id.')

      const { result, replayed } = await withIdempotency(`${ctx.tokenHash}:create_task`, args.idempotency_key, async () => {
        let projectId = args.project_id
        let columnId = args.column_id
        if (args.sprint_id) {
          const sprint = await ctx.gw.get<RawSprint>(`/sprints/${args.sprint_id}`)
          projectId ??= sprint.projectId ? String(sprint.projectId) : undefined
          columnId ??= await firstColumnId(ctx, args.sprint_id)
        }
        const card = await ctx.gw.post<RawCard>('/cards', {
          ...toCardBody(args),
          priority: args.priority ?? 'media',
          projectId,
          sprintId: args.sprint_id,
          sprintColumnId: columnId,
          ...(args.sprint_id && columnId ? { sprintPosition: await nextSprintPosition(ctx, args.sprint_id, columnId) } : {}),
        })
        const taskId = String(card.id)
        const responsibles = await syncSet(ctx, taskId, 'responsibles', [], args.responsible_ids ?? [])
        const tags = await syncSet(ctx, taskId, 'tags', [], args.tag_ids ?? [])
        await audit(ctx, 'operum_create_task', 'CREATE', 'card', taskId, { projectId, sprintId: args.sprint_id })
        const full = await ctx.gw.get<RawCard>(`/cards/${taskId}`)
        return {
          task: serializeTask(full),
          ...(responsibles.failed.length || tags.failed.length
            ? { warnings: { responsibles_failed: responsibles.failed, tags_failed: tags.failed } }
            : {}),
        }
      })
      return { ...result, ...(replayed ? { idempotent_replay: true } : {}) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_update_task',
    {
      title: 'Atualizar tarefa',
      description:
        'Altera título, descrição, prioridade, cor ou datas. Para mudar coluna/sprint/projeto use operum_move_task; para responsáveis e etiquetas, operum_set_task_responsibles/operum_set_task_tags.',
      inputSchema: { task_id: z.string(), ...taskFieldsShape },
      entity: 'Tarefa',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ task_id, ...fields }, ctx) => {
      const body = toCardBody(fields)
      if (Object.keys(body).length === 0) throw new UserError('Nenhum campo para alterar.')
      await ctx.gw.patch(`/cards/${task_id}`, body)
      await audit(ctx, 'operum_update_task', 'UPDATE', 'card', task_id, { fields: Object.keys(body) })
      return { task: serializeTask(await ctx.gw.get<RawCard>(`/cards/${task_id}`)) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_move_task',
    {
      title: 'Mover tarefa',
      description:
        'Move a tarefa: para outra coluna da mesma sprint (column_id), para outra sprint (sprint_id [+ column_id]; padrão primeira coluna) ou para o backlog (to_backlog: true, opcionalmente project_id de outro projeto). A mudança de coluna fica registrada no histórico com o reason.',
      inputSchema: {
        task_id: z.string(),
        sprint_id: z.string().optional(),
        column_id: z.string().optional(),
        to_backlog: z.boolean().optional(),
        project_id: z.string().optional().describe('Só com to_backlog: backlog de outro projeto do tenant.'),
        position: z.number().int().min(0).optional().describe('Posição na coluna (ou no backlog). Padrão: ao final.'),
        reason: z.string().optional(),
      },
      entity: 'Tarefa, sprint ou coluna',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args, ctx) => {
      const card = await ctx.gw.get<RawCard>(`/cards/${args.task_id}`)
      let body: Record<string, unknown>

      if (args.to_backlog) {
        if (args.sprint_id || args.column_id) throw new UserError('to_backlog não combina com sprint_id/column_id.')
        body = {
          sprintId: null,
          sprintColumnId: null,
          sprintPosition: null,
          ...(args.project_id ? { projectId: args.project_id } : {}),
          ...(args.position !== undefined ? { position: args.position } : {}),
        }
      } else {
        const sprintId = args.sprint_id ?? (card.sprintId ? String(card.sprintId) : undefined)
        if (!sprintId) throw new UserError('A tarefa está no backlog: informe sprint_id para movê-la para uma sprint.')
        if (!args.sprint_id && !args.column_id) throw new UserError('Informe column_id, sprint_id ou to_backlog.')
        const columnId = args.column_id ?? (await firstColumnId(ctx, sprintId))
        body = {
          sprintId,
          sprintColumnId: columnId,
          sprintPosition: args.position ?? (await nextSprintPosition(ctx, sprintId, columnId)),
        }
      }
      if (args.reason) body.reason = args.reason

      await ctx.gw.patch(`/cards/${args.task_id}`, body)
      await audit(ctx, 'operum_move_task', 'MOVE', 'card', args.task_id, {
        from: { sprintId: card.sprintId ?? null, columnId: card.sprintColumnId ?? null },
        to: { sprintId: body.sprintId ?? null, columnId: body.sprintColumnId ?? null },
      })
      return { task: serializeTask(await ctx.gw.get<RawCard>(`/cards/${args.task_id}`)) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_delete_task',
    {
      title: 'Excluir tarefa',
      description: 'Exclui a tarefa (soft delete). Exige confirm: true.',
      inputSchema: { task_id: z.string(), ...confirmShape },
      entity: 'Tarefa',
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ task_id, confirm }, ctx) => {
      requireConfirm(confirm, 'Excluir tarefa')
      await ctx.gw.delete(`/cards/${task_id}`)
      await audit(ctx, 'operum_delete_task', 'DELETE', 'card', task_id)
      return { deleted: true, task_id }
    },
  )

  for (const kind of ['tags', 'responsibles'] as const) {
    const name = kind === 'tags' ? 'operum_set_task_tags' : 'operum_set_task_responsibles'
    const idsField = kind === 'tags' ? 'tag_ids' : 'user_ids'
    defineTool(
      server,
      registry,
      name,
      {
        title: kind === 'tags' ? 'Definir etiquetas da tarefa' : 'Definir responsáveis da tarefa',
        description:
          kind === 'tags'
            ? 'Define o conjunto completo de etiquetas da tarefa (substitui o atual). ids de operum_list_tags.'
            : 'Define o conjunto completo de responsáveis da tarefa (substitui o atual). ids de operum_list_users.',
        inputSchema: { task_id: z.string(), [idsField]: z.array(z.string()) },
        entity: 'Tarefa',
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      },
      async (args, ctx) => {
        const taskId = String(args.task_id)
        const desired = (args as Record<string, unknown>)[idsField] as string[]
        const card = serializeTask(await ctx.gw.get<RawCard>(`/cards/${taskId}`))!
        const current = (kind === 'tags' ? card.tags.map(t => t.id) : card.responsibles.map(r => r?.id)).filter(
          (id): id is string => !!id,
        )
        const diff = await syncSet(ctx, taskId, kind, current, [...new Set(desired)])
        await audit(ctx, name, 'UPDATE', 'card', taskId, { [kind]: { added: diff.added, removed: diff.removed } })
        return { ...diff, task: serializeTask(await ctx.gw.get<RawCard>(`/cards/${taskId}`)) }
      },
    )
  }

  defineTool(
    server,
    registry,
    'operum_bulk_update_tasks',
    {
      title: 'Atualizar tarefas em lote',
      description: `Altera até ${MAX_BULK} tarefas numa chamada. dry_run=true (padrão) só mostra o antes/depois de cada uma, sem gravar — revise com o usuário e repita com dry_run=false. column_id move entre colunas da sprint atual da tarefa.`,
      inputSchema: {
        updates: z
          .array(z.object({ task_id: z.string(), column_id: z.string().optional(), ...taskFieldsShape }))
          .min(1)
          .max(MAX_BULK),
        reason: z.string().optional().describe('Motivo registrado nas mudanças de coluna.'),
        dry_run: z.boolean().optional(),
      },
      entity: 'Tarefa',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ updates, reason, dry_run }, ctx) => {
      const dryRun = dry_run !== false
      const results = await mapLimit(updates, READ_CONCURRENCY, async u => {
        const { task_id, column_id, ...fields } = u
        try {
          const body = { ...toCardBody(fields), ...(column_id ? { sprintColumnId: column_id } : {}) }
          if (Object.keys(body).length === 0) return { task_id, ok: false, error: 'nenhum campo para alterar' }
          if (dryRun) {
            const current = serializeTask(await ctx.gw.get<RawCard>(`/cards/${task_id}`))!
            const snake: Record<string, string> = { startDate: 'start_date', endDate: 'end_date', sprintColumnId: 'column_id' }
            const before = Object.fromEntries(
              Object.keys(body).map(k => [snake[k] ?? k, (current as Record<string, unknown>)[snake[k] ?? k] ?? null]),
            )
            const after = Object.fromEntries(Object.entries(body).map(([k, v]) => [snake[k] ?? k, v]))
            return { task_id, ok: true, title: current.title, before, after }
          }
          await ctx.gw.patch(`/cards/${task_id}`, { ...body, ...(column_id && reason ? { reason } : {}) })
          return { task_id, ok: true }
        } catch (err) {
          const status = (err as { status?: number }).status
          return { task_id, ok: false, error: status === 404 ? 'tarefa não encontrada neste tenant' : ((err as { publicMessage?: string }).publicMessage ?? 'falha') }
        }
      })
      if (!dryRun) {
        await audit(ctx, 'operum_bulk_update_tasks', 'BULK_UPDATE', 'card', null, {
          taskIds: results.filter(r => r.ok).map(r => r.task_id),
        })
      }
      return {
        dry_run: dryRun,
        summary: { total: results.length, ok: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length },
        results,
      }
    },
  )

  // ── Etiquetas ─────────────────────────────────────────────

  defineTool(
    server,
    registry,
    'operum_list_tags',
    {
      title: 'Listar etiquetas',
      description: 'Etiquetas (tags) do tenant. Cada etiqueta pertence a quem a criou (owner_user_id), mas todas podem ser usadas em qualquer tarefa.',
      inputSchema: {},
      entity: 'Etiqueta',
      annotations: { readOnlyHint: true },
    },
    async (_args, ctx) => ({ tags: (await ctx.gw.get<Record<string, unknown>[]>('/tags')).map(serializeTag) }),
  )

  defineTool(
    server,
    registry,
    'operum_create_tag',
    {
      title: 'Criar etiqueta',
      description: 'Cria uma etiqueta (ou atualiza a cor, se o usuário já tiver uma com esse nome).',
      inputSchema: { name: z.string().min(1).max(100), color: z.string().optional().describe('Ex.: #ef4444') },
      entity: 'Etiqueta',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ name, color }, ctx) => {
      const tag = await ctx.gw.post<Record<string, unknown>>('/tags', { name, color })
      await audit(ctx, 'operum_create_tag', 'CREATE', 'tag', String(tag.id))
      return { tag: serializeTag(tag) }
    },
  )

  // ── Comentários ───────────────────────────────────────────

  defineTool(
    server,
    registry,
    'operum_list_comments',
    {
      title: 'Listar comentários',
      description: 'Comentários da tarefa em ordem cronológica, com autor e data.',
      inputSchema: { task_id: z.string(), ...paginationShape },
      entity: 'Tarefa',
      annotations: { readOnlyHint: true },
    },
    async ({ task_id, cursor, limit }, ctx) => {
      const comments = (await ctx.gw.get<Record<string, unknown>[]>(`/cards/${task_id}/comments`)).map(serializeComment)
      return paginate(comments, cursor, limit) as unknown as Record<string, unknown>
    },
  )

  defineTool(
    server,
    registry,
    'operum_create_comment',
    {
      title: 'Comentar tarefa',
      description: 'Adiciona um comentário na tarefa. O autor é o dono do token.',
      inputSchema: {
        task_id: z.string(),
        content: z.string().min(1).max(20000),
        type: z.enum(['COMMENT', 'FEEDBACK']).optional(),
      },
      entity: 'Tarefa',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ task_id, content, type }, ctx) => {
      const comment = await ctx.gw.post<Record<string, unknown>>(`/cards/${task_id}/comments`, { content, type })
      await audit(ctx, 'operum_create_comment', 'CREATE', 'comment', String(comment.id), { cardId: task_id })
      return { comment: serializeComment(comment) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_update_comment',
    {
      title: 'Editar comentário',
      description: 'Edita um comentário. Só o autor pode editar.',
      inputSchema: { task_id: z.string(), comment_id: z.string(), content: z.string().min(1).max(20000) },
      entity: 'Comentário',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ task_id, comment_id, content }, ctx) => {
      const comment = await ctx.gw.patch<Record<string, unknown>>(`/cards/${task_id}/comments/${comment_id}`, { content })
      await audit(ctx, 'operum_update_comment', 'UPDATE', 'comment', comment_id, { cardId: task_id })
      return { comment: serializeComment(comment) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_delete_comment',
    {
      title: 'Excluir comentário',
      description: 'Exclui um comentário (só o autor). Exige confirm: true.',
      inputSchema: { task_id: z.string(), comment_id: z.string(), ...confirmShape },
      entity: 'Comentário',
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ task_id, comment_id, confirm }, ctx) => {
      requireConfirm(confirm, 'Excluir comentário')
      await ctx.gw.delete(`/cards/${task_id}/comments/${comment_id}`)
      await audit(ctx, 'operum_delete_comment', 'DELETE', 'comment', comment_id, { cardId: task_id })
      return { deleted: true, comment_id }
    },
  )

  // ── Atividade ─────────────────────────────────────────────

  defineTool(
    server,
    registry,
    'operum_get_activity',
    {
      title: 'Histórico de alterações',
      description:
        'Histórico de uma entidade. Para tarefa: movimentações entre colunas + registros de auditoria. Para projeto/sprint: registros de auditoria (hoje o Operum só audita parte das operações — as feitas via MCP sempre são registradas).',
      inputSchema: {
        entity: z.enum(['card', 'project', 'sprint']).describe('card = tarefa.'),
        entity_id: z.string(),
        ...paginationShape,
      },
      entity: 'Entidade',
      annotations: { readOnlyHint: true },
    },
    async ({ entity, entity_id, cursor, limit }, ctx) => {
      const [movements, auditLog] = await Promise.all([
        entity === 'card' ? ctx.gw.get<Record<string, unknown>[]>(`/cards/${entity_id}/movements`) : Promise.resolve([]),
        ctx.gw.get<Record<string, unknown>[]>('/audit', { entity, entityId: entity_id, limit: 200 }),
      ])
      const events = [
        ...movements.map(m => ({ kind: 'movement' as const, at: String(m.movedAt), ...serializeMovement(m) })),
        ...auditLog.map(a => ({ kind: 'audit' as const, at: String(a.timestamp), ...serializeAudit(a) })),
      ].sort((a, b) => (a.at < b.at ? 1 : -1))
      return paginate(events, cursor, limit) as unknown as Record<string, unknown>
    },
  )
}
