import { describe, it, expect, beforeEach } from 'vitest'
import { setupHarness, seedSourceProject, type Harness } from './harness'

let h: Harness
let seed: Awaited<ReturnType<typeof seedSourceProject>>

beforeEach(async () => {
  h = await setupHarness()
  seed = await seedSourceProject(h)
})

const copyArgs = () => ({ source_tenant_id: 't-mav', project_id: seed.project.id, target_tenant_id: 't-fab' })

describe('operum_copy_project — dry_run (padrão)', () => {
  it('mostra o plano e não grava nada no destino', async () => {
    const res = await h.call('operum_copy_project', copyArgs())
    expect(res.dry_run).toBe(true)
    expect((res.counts as { planned: Record<string, number> }).planned).toMatchObject({
      project: 1, members: 2, stakeholders: 1, new_tags: 2, sprints: 2, columns: 8, tasks: 4,
      tag_links: 2, responsibles: 2, comments: 2, macro_fases: 1,
    })
    expect(res.unmapped_users).toEqual([{ source_user_id: 'u-bruno-mav', name: 'Bruno', email: 'bruno@mavellium.com' }])
    expect(h.op.calls.filter(c => c.tenantId === 't-fab' && c.method !== 'GET')).toEqual([])
  })

  it('casa e-mail sem diferenciar maiúsculas', async () => {
    const res = await h.call('operum_copy_project', copyArgs())
    expect(res.user_mapping).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source_user_id: 'u-ana-mav', target_user_id: 'u-ana-fab', matched_by: 'email' }),
        expect.objectContaining({ source_user_id: 'u-vini-mav', target_user_id: 'u-vini-fab', matched_by: 'email' }),
      ]),
    )
  })
})

describe('operum_copy_project — execução', () => {
  it('recria projeto, estrutura, tarefas, responsáveis e comentários no tenant de destino', async () => {
    const res = await h.call('operum_copy_project', { ...copyArgs(), dry_run: false })
    expect(res.errors).toEqual([])
    const target = res.target as { project_id: string; tenant_id: string }
    expect(target.tenant_id).toBe('t-fab')

    const created = (res.counts as { created: Record<string, number> }).created
    expect(created).toMatchObject({
      project: 1, members: 2, stakeholders: 1, new_tags: 2, sprints: 2, columns: 8, tasks: 4,
      tag_links: 2, responsibles: 2, comments: 2, macro_fases: 1,
    })

    // Estrutura lida de volta pelo próprio MCP, no tenant do Fábio
    const project = await h.call('operum_get_project', { tenant_id: 't-fab', project_id: target.project_id })
    expect(project.project).toMatchObject({ name: 'Operum', start_date: '2026-01-05T00:00:00.000Z', charter: { justificativa: 'Porque sim' } })
    expect((project.project as { description: string }).description).toMatch(/Importado de "Mavellium" \/ "Operum"/)
    expect((project.members as { user_id: string }[]).map(m => m.user_id).sort()).toEqual(['u-ana-fab', 'u-vini-fab'])
    const sprints = project.sprints as { name: string; columns: { title: string }[] }[]
    expect(sprints.find(s => s.name === 'Sprint 1')!.columns.map(c => c.title)).toEqual(['Backlog da sprint', 'Fazendo', 'Feito'])
    expect(sprints.find(s => s.name === 'Sprint 2')!.columns.map(c => c.title)).toEqual([
      'A Fazer', 'Em andamento', 'Em teste', 'Concluído', 'Homologação',
    ])

    const tasks = await h.call('operum_list_tasks', { tenant_id: 't-fab', project_id: target.project_id, fields: 'full' })
    const byTitle = Object.fromEntries((tasks.items as Record<string, unknown>[]).map(t => [t.title, t]))
    expect(Object.keys(byTitle).sort()).toEqual(['Dashboard', 'Ideia: modo escuro', 'Login', 'Relatório de horas'])
    expect(byTitle['Login']).toMatchObject({ sprint_name: 'Sprint 1', column_title: 'Feito', priority: 'alta', end_date: '2026-01-20T00:00:00.000Z' })
    expect((byTitle['Login'].responsibles as { id: string }[]).map(r => r.id)).toEqual(['u-ana-fab'])
    expect((byTitle['Login'].tags as { name: string }[]).map(t => t.name)).toEqual(['bug'])
    expect(byTitle['Dashboard']).toMatchObject({ column_title: 'Homologação', responsibles: [] })
    expect(byTitle['Ideia: modo escuro']).toMatchObject({ in_backlog: true })

    const login = await h.call('operum_get_task', { tenant_id: 't-fab', task_id: (byTitle['Login'] as { id: string }).id })
    const comments = (login.task as { comments: { content: string }[] }).comments
    expect(comments.map(c => c.content)).toEqual([
      expect.stringMatching(/^\[Comentário original de Vinícius <vini@mavellium\.com> em .* UTC\]\n\nPrimeiro comentário$/),
      expect.stringMatching(/^\[Comentário original de Ana <ana@mavellium\.com> .*\]\n\nResposta da Ana$/),
    ])

    // Origem intacta e auditoria no destino
    expect(h.op.calls.filter(c => c.tenantId === 't-mav' && c.method !== 'GET')).toEqual([])
    expect(h.op.audit.find(a => a.tenantId === 't-fab' && a.action === 'IMPORT')).toMatchObject({
      entity: 'project',
      entityId: target.project_id,
      details: { via: 'mcp', tool: 'operum_copy_project', sourceTenantId: 't-mav' },
    })
    expect(res.skipped).toEqual([expect.objectContaining({ entity: 'member', source_id: 'u-bruno-mav' })])
  })

  it('segunda execução é bloqueada pelo conflito de nome; new_name permite duplicar', async () => {
    await h.call('operum_copy_project', { ...copyArgs(), dry_run: false })
    const again = await h.raw('operum_copy_project', { ...copyArgs(), dry_run: false })
    expect(again.isError).toBe(true)
    expect(again.content[0].text).toMatch(/Já existe um projeto "Operum".*new_name/)

    const renamed = await h.call('operum_copy_project', { ...copyArgs(), dry_run: false, new_name: 'Operum (cópia)' })
    expect((renamed.target as { project_name: string }).project_name).toBe('Operum (cópia)')
  })

  it('user_mapping explícito cobre quem não existe por e-mail', async () => {
    const res = await h.call('operum_copy_project', {
      ...copyArgs(),
      dry_run: false,
      user_mapping: { 'bruno@mavellium.com': 'u-vini-fab' },
    })
    expect(res.unmapped_users).toEqual([])
    const tasks = await h.call('operum_list_tasks', { tenant_id: 't-fab', project_id: (res.target as { project_id: string }).project_id })
    const dashboard = (tasks.items as { title: string; responsibles: { id: string }[] }[]).find(t => t.title === 'Dashboard')!
    expect(dashboard.responsibles.map(r => r.id)).toEqual(['u-vini-fab'])
  })

  it('falha pontual de uma tarefa entra em errors sem abortar o resto', async () => {
    h.op.failWhen = (method, path, body) =>
      method === 'POST' && path === '/cards' && (body as { title?: string }).title === 'Dashboard'
        ? Object.assign(new Error('boom'), { status: 500 })
        : null
    const res = await h.call('operum_copy_project', { ...copyArgs(), dry_run: false })
    expect(res.errors).toEqual([expect.objectContaining({ entity: 'task', message: 'falha (HTTP 500)' })])
    expect((res.counts as { created: Record<string, number> }).created.tasks).toBe(3)
  })

  it('include_comments=false não copia comentários', async () => {
    const res = await h.call('operum_copy_project', { ...copyArgs(), dry_run: false, include_comments: false })
    expect((res.counts as { created: Record<string, number> }).created.comments).toBe(0)
  })
})

describe('export + import separados', () => {
  it('bundle exportado reimporta com o mesmo resultado', async () => {
    const exported = await h.call('operum_export_project', { project_id: seed.project.id })
    const bundle = exported.bundle as { format: string; stats: Record<string, number> }
    expect(bundle.format).toBe('operum-project/v1')
    expect(bundle.stats).toMatchObject({ sprints: 2, tasks: 4, comments: 2, backlog_tasks: 1 })

    const res = await h.call('operum_import_project', { target_tenant_id: 't-fab', bundle, dry_run: false })
    expect(res.errors).toEqual([])
    expect((res.counts as { created: Record<string, number> }).created.tasks).toBe(4)
  })

  it('rejeita bundle que não veio do export', async () => {
    const res = await h.raw('operum_import_project', { target_tenant_id: 't-fab', bundle: { foo: 1 }, dry_run: false })
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toMatch(/Bundle inválido/)
  })
})

describe('importação para projeto existente', () => {
  it('dry-run lista duplicadas e preserva cadastro; execução reaproveita nomes normalizados', async () => {
    const gw = h.op.gateway('u-vini-fab')
    const target = await gw.post<Record<string,string>>('/projects',{ name: 'Destino', description: 'Preservar', justificativa: 'Texto vigente' })
    const sprint = await gw.post<Record<string,string>>('/sprints',{ projectId: target.id, name: '  SPRINT   1  ' })
    const columns = await gw.get<Record<string,string>[]>(`/sprints/${sprint.id}/columns`)
    await gw.patch(`/sprints/${sprint.id}/columns/${columns[0].id}`,{ title: '  FEITO ' })
    await gw.post('/cards',{ projectId: target.id, title: 'LOGIN' })
    const preview = await h.call('operum_copy_project',{ ...copyArgs(), target_project_id: target.id })
    expect(preview.dry_run).toBe(true)
    expect(preview.skipped).toContainEqual(expect.objectContaining({ entity: 'task', message: expect.stringContaining('LOGIN') }))
    expect(preview.target).toMatchObject({ project_id: target.id, project_name: 'Destino' })
    expect((preview.counts as { planned: Record<string,number> }).planned).toMatchObject({ project: 0, tasks: 3, sprints: 1 })
    const before = h.op.calls.length
    const report = await h.call('operum_copy_project',{ ...copyArgs(), target_project_id: target.id, dry_run: false })
    expect(report.errors).toEqual([])
    expect((report.counts as { created: Record<string,number> }).created).toMatchObject({ project: 0, tasks: 3, sprints: 1 })
    const writes = h.op.calls.slice(before).filter(c=>c.tenantId==='t-fab' && c.method!=='GET')
    expect(writes.some(c=>c.method==='DELETE')).toBe(false)
    expect(writes.some(c=>c.method==='PATCH' && c.path.includes(sprint.id))).toBe(false)
    const project = await gw.get<Record<string,unknown>>(`/projects/${target.id}`)
    expect(project).toMatchObject({ name: 'Destino', description: 'Preservar', justificativa: 'Texto vigente' })
    const repeated = await h.call('operum_copy_project',{ ...copyArgs(), target_project_id: target.id, dry_run: false })
    expect((repeated.counts as { created: Record<string,number> }).created.tasks).toBe(0)
    expect((repeated.skipped as { entity: string }[]).filter(x=>x.entity==='task')).toHaveLength(4)
  })
  it('destino de outro tenant e ID com caminho são recusados sem escrita', async () => {
    const before = h.op.calls.length
    await expect(h.call('operum_copy_project',{ ...copyArgs(), target_project_id: seed.project.id, dry_run: false })).rejects.toThrow()
    await expect(h.call('operum_copy_project',{ ...copyArgs(), target_project_id: '../projects', dry_run: false })).rejects.toThrow()
    expect(h.op.calls.slice(before).filter(c=>c.tenantId==='t-fab' && c.method!=='GET')).toEqual([])
  })
})

it('similaridade respeita o limite de 0,9 e normalização Unicode', async()=>{
  const { titleSimilarity }=await import('../migration/importer.js')
  expect(titleSimilarity('ABCDEFGHIJ','ABCDEFGHIX')).toBeCloseTo(0.9)
  expect(titleSimilarity('ABCDEFGHIJ','ABCDEFGHXX')).toBeLessThan(0.9)
  expect(titleSimilarity('  RELATÓRIO   DE HORAS ','relato\u0301rio de horas')).toBe(1)
})
