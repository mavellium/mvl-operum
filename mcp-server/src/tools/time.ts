import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TenantContext, TenantRegistry } from '../tenants.js'
import { audit, defineTool, idSchema } from '../tool.js'
import { serializeTimeEntry } from '../serializers.js'
import { UserError } from '../errors.js'
import { dateInput, toIso } from '../dates.js'
import { nextSprintPosition, type RawCard } from './tasks.js'

type RawEntry = Record<string, unknown> & { id: string; cardId: string; card?: { title?: string } | null }
type RawColumn = Record<string, unknown> & { id: string; title: string; position: number }

/** Iguais ao app (app/actions/time.ts): lançamento manual de até 168 h e descrição de até 500 caracteres. */
const MAX_MANUAL_SECONDS = 168 * 3600
const MAX_DESCRIPTION = 500
/** Folga para relógio fora de sincronia ao lançar tempo que termina "agora". */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000

const descriptionShape = z.string().trim().max(MAX_DESCRIPTION).optional()

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const min = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${String(min).padStart(2, '0')}min`
  if (min > 0) return `${min}min`
  return `${seconds}s`
}

/** Timer rodando do dono do token (em qualquer tarefa do tenant), ou null. */
async function runningEntry(ctx: TenantContext): Promise<RawEntry | null> {
  const { entry } = await ctx.gw.get<{ entry: RawEntry | null }>('/time-entries/running')
  return entry
}

function taskLabel(entry: RawEntry): string {
  return entry.card?.title ? `"${entry.card.title}" (${entry.cardId})` : entry.cardId
}

function stopped(entry: RawEntry) {
  const e = serializeTimeEntry(entry)
  return { ...e, duration_formatted: formatDuration(e.duration_seconds ?? 0) }
}

/**
 * Mesma regra da tela (handleCardTimerStarted em components/sprint/SprintBoard.tsx):
 * iniciar o timer leva o card para a coluna "Em andamento", mas só para frente.
 * Card em "Em teste" ou "Concluído" não volta.
 */
async function moveToInProgress(ctx: TenantContext, card: RawCard): Promise<{ id: string; title: string } | null> {
  const sprintId = card.sprintId ? String(card.sprintId) : null
  if (!sprintId) return null
  const columns = await ctx.gw.get<RawColumn[]>(`/sprints/${sprintId}/columns`)
  const target = columns.find(c => String(c.title).trim().toLowerCase() === 'em andamento')
  if (!target) return null
  const current = columns.find(c => c.id === card.sprintColumnId)
  if (current && (current.id === target.id || Number(current.position) >= Number(target.position))) return null

  await ctx.gw.patch(`/cards/${String(card.id)}`, {
    sprintId,
    sprintColumnId: target.id,
    sprintPosition: await nextSprintPosition(ctx, sprintId, target.id),
    reason: 'Timer iniciado pelo MCP',
  })
  return { id: target.id, title: target.title }
}

export function registerTimeTools(server: McpServer, registry: TenantRegistry) {
  defineTool(
    server,
    registry,
    'operum_start_timer',
    {
      title: 'Iniciar timer da tarefa',
      description:
        'Inicia o timer do usuário (dono do token) na tarefa. Como no app, o card vai para a coluna "Em andamento" se estiver numa coluna anterior (nunca volta de "Em teste" ou "Concluído"). ' +
        'Só pode haver um timer rodando por usuário: com stop_running=true, o timer de outra tarefa é parado antes; sem isso, o erro diz qual tarefa está com o timer. ' +
        'Se o timer já está rodando nesta tarefa, não faz nada (already_running=true).',
      inputSchema: {
        task_id: idSchema,
        description: descriptionShape.describe('O que vai ser feito (aparece no histórico de tempo).'),
        stop_running: z.boolean().optional().describe('Para o timer que estiver rodando em outra tarefa antes de iniciar este.'),
      },
      entity: 'Tarefa',
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ task_id, description, stop_running }, ctx) => {
      const card = await ctx.gw.get<RawCard>(`/cards/${task_id}`)
      const running = await runningEntry(ctx)

      if (running?.cardId === task_id) {
        return { entry: serializeTimeEntry(running), already_running: true, moved_to: null, stopped_previous: null }
      }

      let previous: RawEntry | null = null
      if (running) {
        if (!stop_running) {
          throw new UserError(
            `Já há um timer rodando na tarefa ${taskLabel(running)}. Pare com operum_stop_timer ou chame de novo com stop_running: true.`,
          )
        }
        previous = { ...(await ctx.gw.post<RawEntry>(`/time-entries/${running.id}/stop`)), card: running.card }
        await audit(ctx, 'operum_start_timer', 'STOP_TIMER', 'time_entry', running.id, { cardId: running.cardId, motivo: 'stop_running' })
      }

      const entry = await ctx.gw.post<RawEntry>(`/cards/${task_id}/time-entries/start`, description ? { description } : {})

      // O timer já está correndo: se mover o card falhar, avisa em vez de falhar a tool.
      let movedTo: { id: string; title: string } | null = null
      let moveError: string | undefined
      try {
        movedTo = await moveToInProgress(ctx, card)
      } catch {
        moveError = 'O timer foi iniciado, mas não consegui mover o card para "Em andamento". Mova com operum_move_task.'
      }

      await audit(ctx, 'operum_start_timer', 'START_TIMER', 'time_entry', entry.id, {
        cardId: task_id,
        ...(movedTo ? { movedTo: movedTo.title } : {}),
      })
      return {
        entry: serializeTimeEntry(entry),
        already_running: false,
        moved_to: movedTo,
        stopped_previous: previous ? stopped(previous) : null,
        ...(moveError ? { warning: moveError } : {}),
      }
    },
  )

  defineTool(
    server,
    registry,
    'operum_stop_timer',
    {
      title: 'Parar timer',
      description:
        'Para o timer que está rodando para o usuário (dono do token) e grava a duração na tarefa. Com task_id, confere que o timer rodando é dessa tarefa. Sem timer rodando, responde stopped=false.',
      inputSchema: {
        task_id: idSchema.optional().describe('Tarefa que deveria estar com o timer (conferência).'),
      },
      entity: 'Tarefa',
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ task_id }, ctx) => {
      const running = await runningEntry(ctx)
      if (!running) return { stopped: false, message: 'Nenhum timer rodando.' }
      if (task_id && running.cardId !== task_id) {
        throw new UserError(
          `O timer rodando é da tarefa ${taskLabel(running)}, não de ${task_id}. Chame sem task_id para parar o que está rodando.`,
        )
      }
      const entry = await ctx.gw.post<RawEntry>(`/time-entries/${running.id}/stop`)
      await audit(ctx, 'operum_stop_timer', 'STOP_TIMER', 'time_entry', running.id, { cardId: running.cardId })
      return { stopped: true, entry: stopped({ ...entry, card: running.card }) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_log_time',
    {
      title: 'Lançar tempo manual',
      description:
        'Registra na tarefa um período já trabalhado (sem timer), em nome do dono do token. Até 168 h por lançamento; o fim não pode estar no futuro.',
      inputSchema: {
        task_id: idSchema,
        started_at: dateInput,
        ended_at: dateInput,
        description: descriptionShape.describe('O que foi feito.'),
      },
      entity: 'Tarefa',
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ task_id, started_at, ended_at, description }, ctx) => {
      const start = toIso(started_at, 'started_at')!
      const end = toIso(ended_at, 'ended_at')!
      const seconds = (Date.parse(end) - Date.parse(start)) / 1000
      if (seconds <= 0) throw new UserError('ended_at deve ser depois de started_at.')
      if (seconds > MAX_MANUAL_SECONDS) throw new UserError('Um lançamento manual tem no máximo 168 h. Divida em mais de um.')
      if (Date.parse(end) > Date.now() + FUTURE_TOLERANCE_MS) throw new UserError('ended_at não pode estar no futuro.')

      const entry = await ctx.gw.post<RawEntry>(`/cards/${task_id}/time-entries/manual`, {
        startedAt: start,
        endedAt: end,
        ...(description ? { description } : {}),
      })
      await audit(ctx, 'operum_log_time', 'CREATE', 'time_entry', entry.id, { cardId: task_id, seconds })
      return { entry: { ...serializeTimeEntry(entry), duration_formatted: formatDuration(seconds) } }
    },
  )
}
