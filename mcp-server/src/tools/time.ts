import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TenantContext, TenantRegistry } from '../tenants.js'
import { audit, confirmShape, defineTool, idSchema, requireConfirm } from '../tool.js'
import { serializeTimeEntry } from '../serializers.js'
import { UserError } from '../errors.js'
import { dateInput, toIso } from '../dates.js'
import { nextSprintPosition, type RawCard } from './tasks.js'

type RawEntry = Record<string, unknown> & { id: string; cardId: string; card?: { title?: string } | null }
type RawColumn = Record<string, unknown> & { id: string; title: string; position: number }

/** Iguais ao sprint-service (regras-tempo.ts, ADR-046): lançamento de até 12 h e descrição de até 500 caracteres. */
const MAX_MANUAL_SECONDS = 12 * 3600
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

/** Marca que o sprint-service põe na descrição de um timer encerrado no limite (regras-tempo.ts). */
const REVIEW_MARK = '[Revisar]'

function withDuration(entry: RawEntry) {
  const e = serializeTimeEntry(entry)
  return {
    ...e,
    duration_formatted: formatDuration(e.duration_seconds ?? 0),
    needs_review: (e.description ?? '').startsWith(REVIEW_MARK),
  }
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
  const columns = await ctx.gw.get<RawColumn[]>(`/sprints/${sprintId}/columns`, { timeEntries: 'summary' })
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
        'Inicia o timer do usuário (dono do token) na tarefa. Como no app, o card vai para a coluna "Em andamento" se estiver numa coluna anterior (nunca volta de "Em teste" ou "Concluído"); sem responsável, o dono do token vira o responsável (responsible_added=true), porque "Em andamento" exige um. ' +
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

      // "Em andamento" exige responsável (ADR-045): sem nenhum, o dono do token vira o responsável.
      let responsibleAdded = false
      const semResponsavel = !Array.isArray(card.responsibles) || card.responsibles.length === 0
      if (semResponsavel && entry.userId) {
        try {
          await ctx.gw.post(`/cards/${task_id}/responsibles/${String(entry.userId)}`)
          responsibleAdded = true
        } catch { /* segue: o movimento abaixo avisa se faltar responsável */ }
      }

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
        responsible_added: responsibleAdded,
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
        'Registra na tarefa um período já trabalhado (sem timer), em nome do dono do token. Até 12 h por lançamento; o fim não pode estar no futuro e o período não pode se sobrepor a outro lançamento do mesmo usuário (a API recusa e diz qual conflita).',
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
      if (seconds > MAX_MANUAL_SECONDS) throw new UserError('Um lançamento tem no máximo 12 h. Divida em mais de um.')
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

  defineTool(
    server,
    registry,
    'operum_list_time_entries',
    {
      title: 'Listar lançamentos de tempo da tarefa',
      description:
        'Lista os lançamentos de tempo da tarefa (mais recentes primeiro), com quem lançou, início, fim, duração e descrição. ' +
        'needs_review=true marca um timer que o Operum encerrou no limite de 12 h e precisa de conferência. ' +
        'Use o id do lançamento em operum_update_time_entry ou operum_delete_time_entry.',
      inputSchema: {
        task_id: idSchema,
        user_id: idSchema.optional().describe('Só os lançamentos deste usuário (ids em operum_list_users).'),
      },
      entity: 'Tarefa',
      annotations: { readOnlyHint: true },
    },
    async ({ task_id, user_id }, ctx) => {
      const all = await ctx.gw.get<RawEntry[]>(`/cards/${task_id}/time-entries`)
      const entries = all.filter(e => !user_id || e.userId === user_id).map(withDuration)
      const total = entries.filter(e => !e.is_running).reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0)
      return { task_id, entries, total_seconds: total, total_formatted: formatDuration(total) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_update_time_entry',
    {
      title: 'Corrigir lançamento de tempo',
      description:
        'Corrige início, fim e/ou descrição de um lançamento (id em operum_list_time_entries). Só o dono do lançamento ou um admin altera; timer rodando não se edita (pare antes). ' +
        'Informar só started_at mantém o fim atual. Valem as mesmas regras do lançamento manual: até 12 h, fim não no futuro e sem sobreposição com outro lançamento do mesmo usuário. ' +
        'description vazia apaga a descrição.',
      inputSchema: {
        entry_id: idSchema,
        started_at: dateInput.optional(),
        ended_at: dateInput.optional(),
        description: z.string().trim().max(MAX_DESCRIPTION).optional().describe('Nova descrição; "" apaga.'),
      },
      entity: 'Lançamento de tempo',
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ entry_id, started_at, ended_at, description }, ctx) => {
      const start = toIso(started_at, 'started_at')
      const end = toIso(ended_at, 'ended_at')
      if (!start && !end && description === undefined) throw new UserError('Informe started_at, ended_at ou description.')
      if (start && end) {
        const seconds = (Date.parse(end) - Date.parse(start)) / 1000
        if (seconds <= 0) throw new UserError('ended_at deve ser depois de started_at.')
        if (seconds > MAX_MANUAL_SECONDS) throw new UserError('Um lançamento tem no máximo 12 h. Divida em mais de um.')
      }
      if (end && Date.parse(end) > Date.now() + FUTURE_TOLERANCE_MS) throw new UserError('ended_at não pode estar no futuro.')

      const entry = await ctx.gw.patch<RawEntry>(`/time-entries/${entry_id}`, {
        ...(start ? { startedAt: start } : {}),
        ...(end ? { endedAt: end } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
      })
      await audit(ctx, 'operum_update_time_entry', 'UPDATE', 'time_entry', entry_id, {
        cardId: entry.cardId,
        ...(start ? { startedAt: start } : {}),
        ...(end ? { endedAt: end } : {}),
        ...(description !== undefined ? { description: true } : {}),
      })
      return { entry: withDuration(entry) }
    },
  )

  defineTool(
    server,
    registry,
    'operum_delete_time_entry',
    {
      title: 'Apagar lançamento de tempo',
      description:
        'Apaga um lançamento de tempo (id em operum_list_time_entries); o total da tarefa diminui. Só o dono do lançamento ou um admin apaga. ' +
        'Exige confirm: true — confirme com o usuário antes.',
      inputSchema: { entry_id: idSchema, ...confirmShape },
      entity: 'Lançamento de tempo',
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ entry_id, confirm }, ctx) => {
      requireConfirm(confirm, 'Apagar lançamento de tempo')
      await ctx.gw.delete(`/time-entries/${entry_id}`)
      await audit(ctx, 'operum_delete_time_entry', 'DELETE', 'time_entry', entry_id)
      return { deleted: true, entry_id }
    },
  )
}
