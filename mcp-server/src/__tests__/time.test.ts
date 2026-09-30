import { describe, it, expect, beforeEach } from 'vitest'
import { setupHarness, type Harness } from './harness'
import { formatDuration } from '../tools/time'

let h: Harness
let cols: Record<string, string>
let aFazer: string
let emTeste: string
let backlog: string
let outraTarefa: string
let tarefaFabio: string

const card = (id: string) => h.op.cards.find(c => c.id === id)!
const timersRodando = () => h.op.timeEntries.filter(e => e.isRunning)

beforeEach(async () => {
  h = await setupHarness()
  const mav = h.op.gateway('u-vini-mav')
  const project = await mav.post<Record<string, string>>('/projects', { name: 'Operum' })
  const sprint = await mav.post<Record<string, string>>('/sprints', { projectId: project.id, name: 'Sprint 1' })
  const columns = await mav.get<Record<string, string>[]>(`/sprints/${sprint.id}/columns`)
  cols = Object.fromEntries(columns.map(c => [c.title, c.id]))
  const criar = (title: string, coluna?: string) =>
    mav.post<Record<string, string>>('/cards', coluna
      ? { sprintId: sprint.id, sprintColumnId: cols[coluna], sprintPosition: 0, title }
      : { projectId: project.id, title })
  aFazer = (await criar('Timer MCP', 'A Fazer')).id
  emTeste = (await criar('Em validação', 'Em teste')).id
  outraTarefa = (await criar('Outra', 'A Fazer')).id
  backlog = (await criar('No backlog')).id
  const fab = h.op.gateway('u-vini-fab')
  const pFab = await fab.post<Record<string, string>>('/projects', { name: 'Do Fábio' })
  tarefaFabio = (await fab.post<Record<string, string>>('/cards', { projectId: pFab.id, title: 'Gantt' })).id
})

describe('as tools aparecem no MCP', () => {
  it('start, stop e log estão na lista', async () => {
    const names = (await h.client.listTools()).tools.map(t => t.name)
    expect(names).toEqual(expect.arrayContaining(['operum_start_timer', 'operum_stop_timer', 'operum_log_time']))
  })
})

describe('operum_start_timer', () => {
  it('inicia o timer e leva o card de "A Fazer" para "Em andamento", como a tela', async () => {
    const res = await h.call('operum_start_timer', { task_id: aFazer, description: 'SDD 8.4' })
    expect(res).toMatchObject({
      already_running: false,
      stopped_previous: null,
      moved_to: { id: cols['Em andamento'], title: 'Em andamento' },
      entry: { task_id: aFazer, user_id: 'u-vini-mav', is_running: true, description: 'SDD 8.4' },
    })
    expect(card(aFazer).sprintColumnId).toBe(cols['Em andamento'])
    const move = h.op.calls.find(c => c.method === 'PATCH' && c.path === `/cards/${aFazer}`)
    expect(move?.body).toMatchObject({ reason: 'Timer iniciado pelo MCP' })
    expect(h.op.audit.at(-1)).toMatchObject({ action: 'START_TIMER', entity: 'time_entry', details: { cardId: aFazer, movedTo: 'Em andamento' } })
  })

  it('card em "Em teste" não volta de coluna', async () => {
    const res = await h.call('operum_start_timer', { task_id: emTeste })
    expect(res.moved_to).toBeNull()
    expect(card(emTeste).sprintColumnId).toBe(cols['Em teste'])
    expect(timersRodando()).toHaveLength(1)
  })

  it('card do backlog: o timer corre e o card fica onde está', async () => {
    const res = await h.call('operum_start_timer', { task_id: backlog })
    expect(res.moved_to).toBeNull()
    expect(card(backlog).sprintId).toBeUndefined()
    expect(timersRodando()).toHaveLength(1)
  })

  it('timer já rodando na mesma tarefa: não cria outro', async () => {
    await h.call('operum_start_timer', { task_id: aFazer })
    const again = await h.call('operum_start_timer', { task_id: aFazer })
    expect(again.already_running).toBe(true)
    expect(h.op.timeEntries).toHaveLength(1)
  })

  it('timer rodando em outra tarefa: o erro diz qual e não inicia', async () => {
    await h.call('operum_start_timer', { task_id: outraTarefa })
    const res = await h.raw('operum_start_timer', { task_id: aFazer })
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toBe(
      `Já há um timer rodando na tarefa "Outra" (${outraTarefa}). Pare com operum_stop_timer ou chame de novo com stop_running: true.`,
    )
    expect(timersRodando().map(e => e.cardId)).toEqual([outraTarefa])
  })

  it('stop_running: para o timer da outra tarefa e inicia este', async () => {
    await h.call('operum_start_timer', { task_id: outraTarefa })
    const res = await h.call('operum_start_timer', { task_id: aFazer, stop_running: true })
    expect(res.stopped_previous).toMatchObject({ task_id: outraTarefa, task_title: 'Outra', is_running: false, duration_formatted: '0s' })
    expect(timersRodando().map(e => e.cardId)).toEqual([aFazer])
    expect(h.op.audit.filter(a => a.action === 'STOP_TIMER')).toHaveLength(1)
  })

  it('se mover o card falhar, o timer continua e a resposta avisa', async () => {
    h.op.failWhen = (method, path) => (method === 'PATCH' && path === `/cards/${aFazer}` ? Object.assign(new Error('x'), { status: 500 }) : null)
    const res = await h.call('operum_start_timer', { task_id: aFazer })
    expect(res.moved_to).toBeNull()
    expect(res.warning).toMatch(/não consegui mover o card/)
    expect(timersRodando()).toHaveLength(1)
  })

  it('tarefa de outro tenant: 404 e nenhum timer', async () => {
    const res = await h.raw('operum_start_timer', { task_id: tarefaFabio })
    expect(res.content[0].text).toBe('Não encontrado neste tenant: Tarefa.')
    expect(h.op.timeEntries).toHaveLength(0)
  })
})

describe('operum_stop_timer', () => {
  it('para o timer rodando, grava a duração e audita', async () => {
    await h.call('operum_start_timer', { task_id: aFazer })
    const res = await h.call('operum_stop_timer', { task_id: aFazer })
    expect(res).toMatchObject({ stopped: true, entry: { task_id: aFazer, task_title: 'Timer MCP', is_running: false } })
    expect(timersRodando()).toHaveLength(0)
    expect(h.op.audit.at(-1)).toMatchObject({ action: 'STOP_TIMER', entity: 'time_entry' })
  })

  it('sem timer rodando: stopped=false, sem erro', async () => {
    await expect(h.call('operum_stop_timer', {})).resolves.toEqual({ tenant_id: 't-mav', stopped: false, message: 'Nenhum timer rodando.' })
  })

  it('task_id diferente do timer rodando: recusa e não para', async () => {
    await h.call('operum_start_timer', { task_id: outraTarefa })
    const res = await h.raw('operum_stop_timer', { task_id: aFazer })
    expect(res.content[0].text).toMatch(/O timer rodando é da tarefa "Outra"/)
    expect(timersRodando()).toHaveLength(1)
  })
})

describe('operum_log_time', () => {
  it('lança o período e devolve a duração formatada', async () => {
    const res = await h.call('operum_log_time', {
      task_id: aFazer,
      started_at: '2026-09-29T09:00:00-03:00',
      ended_at: '2026-09-29T10:30:00-03:00',
      description: 'Pesquisa do sprint-service',
    })
    expect(res.entry).toMatchObject({ task_id: aFazer, is_manual: true, duration_seconds: 5400, duration_formatted: '1h 30min' })
    expect(h.op.audit.at(-1)).toMatchObject({ action: 'CREATE', entity: 'time_entry', details: { seconds: 5400 } })
  })

  it.each([
    ['fim antes do início', '2026-09-29T10:00:00Z', '2026-09-29T09:00:00Z', /depois de started_at/],
    ['mais de 168 h', '2026-09-01T00:00:00Z', '2026-09-08T00:00:01Z', /168 h/],
    ['fim no futuro', new Date(Date.now() + 3600e3).toISOString(), new Date(Date.now() + 7200e3).toISOString(), /futuro/],
    ['data inválida', 'ontem', '2026-09-29T09:00:00Z', /started_at: data inválida/],
  ])('recusa %s', async (_caso, started_at, ended_at, erro) => {
    const res = await h.raw('operum_log_time', { task_id: aFazer, started_at, ended_at })
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toMatch(erro)
    expect(h.op.timeEntries).toHaveLength(0)
  })

  it('tarefa de outro tenant: 404', async () => {
    const res = await h.raw('operum_log_time', { task_id: tarefaFabio, started_at: '2026-09-29T09:00:00Z', ended_at: '2026-09-29T10:00:00Z' })
    expect(res.content[0].text).toBe('Não encontrado neste tenant: Tarefa.')
  })
})

describe('operum_get_task mostra o tempo', () => {
  it('total lançado e timer rodando', async () => {
    await h.call('operum_log_time', { task_id: aFazer, started_at: '2026-09-29T09:00:00Z', ended_at: '2026-09-29T10:00:00Z' })
    await h.call('operum_start_timer', { task_id: aFazer })
    const { task } = await h.call('operum_get_task', { task_id: aFazer }) as { task: { time: Record<string, unknown> } }
    expect(task.time).toMatchObject({ total_seconds: 3600, running: [{ user_id: 'u-vini-mav' }] })
  })
})

describe('formatDuration', () => {
  it.each([[0, '0s'], [45, '45s'], [60, '1min'], [3599, '59min'], [3600, '1h 00min'], [5400, '1h 30min'], [90061, '25h 01min']])(
    '%i s → %s',
    (s, texto) => expect(formatDuration(s)).toBe(texto),
  )
})
