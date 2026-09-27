import type { Gateway } from '../gateway.js'
import type { TenantContext } from '../tenants.js'
import type { ProgressFn } from '../tool.js'
import { mapLimit } from '../concurrency.js'
import { UserError } from '../errors.js'
import { BUNDLE_FORMAT, bundleStats, type BundlePerson, type BundleTask, type ProjectBundle } from './export.js'

type Raw = Record<string, unknown>

export interface ImportOptions {
  /** id ou e-mail de origem → id ou e-mail no destino. Tem prioridade sobre o casamento por e-mail. */
  userMapping?: Record<string, string>
  newName?: string
  includeComments: boolean
  dryRun: boolean
  progress?: ProgressFn
}

interface Issue {
  entity: string
  source_id: string | null
  message: string
}

export interface ImportReport {
  dry_run: boolean
  source: ProjectBundle['source']
  target: { tenant_id: string; tenant_name: string | null; project_id: string | null; project_name: string }
  counts: { planned: Record<string, number>; created: Record<string, number> }
  user_mapping: { source_user_id: string; name: string | null; email: string | null; target_user_id: string | null; matched_by: string | null }[]
  unmapped_users: { source_user_id: string; name: string | null; email: string | null }[]
  skipped: Issue[]
  errors: Issue[]
  not_supported: string[]
  warnings: string[]
  id_map?: { sprints: Record<string, string>; columns: Record<string, string>; tasks: Record<string, string>; tags: Record<string, string> }
}

const WRITE_CONCURRENCY = 4

function publicMessage(err: unknown): string {
  const e = err as { status?: number; publicMessage?: string }
  if (e?.publicMessage) return e.publicMessage
  if (e?.status === 404) return 'recurso não encontrado no destino'
  if (e?.status === 403) return 'sem permissão (o token do destino precisa de escopo write)'
  return `falha${e?.status ? ` (HTTP ${e.status})` : ''}`
}

export function validateBundle(bundle: unknown): ProjectBundle {
  const b = bundle as Partial<ProjectBundle> | null
  if (!b || typeof b !== 'object' || b.format !== BUNDLE_FORMAT) {
    throw new UserError(`Bundle inválido: esperado format "${BUNDLE_FORMAT}" (gerado por operum_export_project).`)
  }
  if (!b.project?.name || !Array.isArray(b.tasks) || !Array.isArray(b.sprints) || !b.source) {
    throw new UserError('Bundle incompleto: faltam project, sprints, tasks ou source.')
  }
  return b as ProjectBundle
}

function stripCharter(p: ProjectBundle['project']): Raw {
  return {
    justificativa: p.charter?.justificativa,
    objetivos: p.charter?.objetivos,
    metodologia: p.charter?.metodologia,
    descricaoProduto: p.charter?.descricao_produto,
    premissas: p.charter?.premissas,
    restricoes: p.charter?.restricoes,
    limitesAutoridade: p.charter?.limites_autoridade,
  }
}

const compact = (o: Raw): Raw => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined))

function commentHeader(author: BundlePerson, createdAt: string | null): string {
  const who = author.email ? `${author.name ?? 'Usuário'} <${author.email}>` : (author.name ?? 'Usuário desconhecido')
  const when = createdAt ? ` em ${createdAt.slice(0, 16).replace('T', ' ')} UTC` : ''
  return `[Comentário original de ${who}${when}]`
}

/**
 * Recria um projeto exportado em outro tenant usando apenas a API pública do
 * Operum com o PAT do destino. Pessoas são casadas por e-mail; quem não existir
 * no destino fica sem vínculo e entra no relatório.
 */
export async function importProject(
  target: TenantContext,
  gw: Gateway,
  rawBundle: unknown,
  opts: ImportOptions,
): Promise<ImportReport> {
  const bundle = validateBundle(rawBundle)
  const progress = opts.progress ?? (() => {})
  const projectName = (opts.newName ?? bundle.project.name) as string
  const includeComments = opts.includeComments && bundle.source.include_comments !== false

  const report: ImportReport = {
    dry_run: opts.dryRun,
    source: bundle.source,
    target: { tenant_id: target.tenantId, tenant_name: target.tenantName, project_id: null, project_name: projectName },
    counts: { planned: {}, created: {} },
    user_mapping: [],
    unmapped_users: [],
    skipped: [],
    errors: [],
    not_supported: [],
    warnings: [],
  }

  // ── Preflight (vale para dry_run e execução) ─────────────────
  progress(0, undefined, 'Preparando importação')
  const [targetUsers, targetProjects, targetTags] = await Promise.all([
    gw.get<Raw[]>('/auth/all-users'),
    (async () => {
      const all: Raw[] = []
      for (let page = 1; page <= 100; page++) {
        const res = await gw.get<{ items: Raw[]; total: number }>('/projects', { page, limit: 100 })
        all.push(...res.items)
        if (all.length >= res.total || res.items.length === 0) break
      }
      return all
    })(),
    gw.get<Raw[]>('/tags'),
  ])

  if (targetProjects.some(p => p.name === projectName)) {
    throw new UserError(
      `Já existe um projeto "${projectName}" no tenant de destino (o nome é único por tenant). ` +
        'Passe new_name com outro nome ou, se for uma importação anterior com falha, exclua-a antes.',
    )
  }

  // Mapeamento de pessoas: explícito (id ou e-mail) > e-mail igual (usuários ativos).
  const activeTargetUsers = targetUsers.filter(u => u.isActive !== false)
  const targetByEmail = new Map(activeTargetUsers.map(u => [String(u.email).toLowerCase(), String(u.id)]))
  const targetIds = new Set(activeTargetUsers.map(u => String(u.id)))
  const explicit = new Map(Object.entries(opts.userMapping ?? {}).map(([k, v]) => [k.toLowerCase(), v]))

  const people = new Map<string, BundlePerson>()
  const addPerson = (p: BundlePerson) => {
    if (p.source_user_id && !people.has(p.source_user_id)) people.set(p.source_user_id, p)
  }
  bundle.members.forEach(addPerson)
  bundle.tasks.forEach(t => {
    t.responsibles.forEach(addPerson)
    t.comments.forEach(c => addPerson(c.author))
  })

  const userMap = new Map<string, string>()
  for (const p of people.values()) {
    let targetId: string | null = null
    let matchedBy: string | null = null
    const explicitValue = explicit.get(p.source_user_id.toLowerCase()) ?? (p.email ? explicit.get(p.email.toLowerCase()) : undefined)
    if (explicitValue) {
      targetId = targetIds.has(explicitValue) ? explicitValue : (targetByEmail.get(explicitValue.toLowerCase()) ?? null)
      matchedBy = targetId ? 'user_mapping' : null
      if (!targetId) report.warnings.push(`user_mapping de ${p.email ?? p.source_user_id} aponta para "${explicitValue}", que não existe no destino.`)
    } else if (p.email) {
      targetId = targetByEmail.get(p.email.toLowerCase()) ?? null
      matchedBy = targetId ? 'email' : null
    }
    if (targetId) userMap.set(p.source_user_id, targetId)
    else report.unmapped_users.push({ source_user_id: p.source_user_id, name: p.name, email: p.email })
    report.user_mapping.push({ source_user_id: p.source_user_id, name: p.name, email: p.email, target_user_id: targetId, matched_by: matchedBy })
  }

  const targetTagByName = new Map<string, string>()
  for (const t of targetTags) {
    const key = String(t.name)
    if (!targetTagByName.has(key)) targetTagByName.set(key, String(t.id))
  }
  const tagsToCreate = bundle.tags.filter(t => !targetTagByName.has(t.name))

  const stats = bundleStats(bundle)
  const mappedResponsibles = bundle.tasks.reduce((acc, t) => acc + t.responsibles.filter(r => userMap.has(r.source_user_id)).length, 0)
  report.counts.planned = {
    project: 1,
    macro_fases: stats.macro_fases,
    members: bundle.members.filter(m => userMap.has(m.source_user_id)).length,
    stakeholders: stats.stakeholders,
    new_tags: tagsToCreate.length,
    sprints: stats.sprints,
    columns: stats.columns,
    tasks: stats.tasks,
    tag_links: stats.tag_links,
    responsibles: mappedResponsibles,
    comments: includeComments ? stats.comments : 0,
  }

  if (stats.attachments > 0) {
    report.not_supported.push(`Anexos (${stats.attachments}): não copiados — os arquivos ficam no storage do tenant de origem.`)
  }
  report.not_supported.push(
    'Histórico de movimentação entre colunas, métricas/feedback de sprint, apontamento de horas e documentos do monólito (WBS/EAP/atas) não são copiados.',
  )
  if (bundle.members.some(m => m.source_user_id && !userMap.has(m.source_user_id))) {
    report.warnings.push('Membros sem correspondente no destino não foram adicionados ao projeto (ver unmapped_users).')
  }
  if (bundle.tasks.some(t => t.responsibles.some(r => !userMap.has(r.source_user_id)))) {
    report.warnings.push('Tarefas com responsável sem correspondente no destino ficam sem esse responsável.')
  }
  if (includeComments && stats.comments > 0) {
    report.warnings.push('Comentários são criados em nome do dono do token de destino; autor e data originais vão no início do texto.')
  }

  if (opts.dryRun) return report

  // ── Execução ────────────────────────────────────────────────
  const created: Record<string, number> = {
    project: 0, macro_fases: 0, members: 0, stakeholders: 0, new_tags: 0, sprints: 0,
    columns: 0, tasks: 0, tag_links: 0, responsibles: 0, comments: 0,
  }
  report.counts.created = created
  const idMap = { sprints: {} as Record<string, string>, columns: {} as Record<string, string>, tasks: {} as Record<string, string>, tags: {} as Record<string, string> }
  report.id_map = idMap
  const fail = (entity: string, sourceId: string | null, err: unknown) =>
    report.errors.push({ entity, source_id: sourceId, message: publicMessage(err) })

  // 1. Projeto — falha aqui aborta (nada foi criado ainda).
  progress(1, 7, 'Criando projeto')
  const note = `Importado de "${bundle.source.tenant_name ?? bundle.source.tenant_id}" / "${bundle.project.name}" em ${new Date().toISOString().slice(0, 10)} via MCP.`
  const p = bundle.project
  const createdProject = await gw.post<Raw>(
    '/projects',
    compact({
      name: projectName,
      description: p.description ? `${p.description}\n\n---\n${note}` : note,
      slogan: p.slogan,
      location: p.location,
      logoUrl: p.logo_url,
      startDate: p.start_date,
      endDate: p.end_date,
      semestre: p.semestre,
      ano: p.ano,
      departamentos: p.departamentos?.length ? p.departamentos : undefined,
      ...stripCharter(p),
    }),
  )
  const projectId = String(createdProject.id)
  report.target.project_id = projectId
  created.project = 1

  if (p.status && p.status !== 'ACTIVE') {
    await gw.patch(`/projects/${projectId}`, { status: p.status }).catch(err => fail('project_status', bundle.source.project_id, err))
  }

  // 2. Macro-fases, membros e stakeholders
  progress(2, 7, 'Macro-fases, membros e stakeholders')
  if (bundle.macro_fases.length) {
    try {
      await gw.post(`/projects/${projectId}/macro-fases`, {
        fases: bundle.macro_fases.map(f => compact({ fase: f.fase, dataLimite: f.data_limite, custo: f.custo })),
      })
      created.macro_fases = bundle.macro_fases.length
    } catch (err) {
      fail('macro_fases', null, err)
    }
  }

  for (const m of bundle.members) {
    const userId = userMap.get(m.source_user_id)
    if (!userId) {
      report.skipped.push({ entity: 'member', source_id: m.source_user_id, message: `sem correspondente no destino (${m.email ?? 'sem e-mail'})` })
      continue
    }
    try {
      await gw.post(`/projects/${projectId}/members`, compact({ userId, role: m.role, hourlyRate: m.hourly_rate }))
      created.members++
    } catch (err) {
      fail('member', m.source_user_id, err)
    }
  }

  if (bundle.stakeholders.length) {
    const existing = await gw.get<Raw[]>('/stakeholders').catch(() => [] as Raw[])
    const byName = new Map(existing.map(st => [String(st.name), String(st.id)]))
    for (const st of bundle.stakeholders) {
      try {
        let stakeholderId = byName.get(String(st.name))
        if (!stakeholderId) {
          const createdSt = await gw.post<Raw>('/stakeholders', compact(st))
          stakeholderId = String(createdSt.id)
          byName.set(String(st.name), stakeholderId)
        }
        await gw.post(`/stakeholders/${stakeholderId}/projects/${projectId}`)
        created.stakeholders++
      } catch (err) {
        fail('stakeholder', String(st.name), err)
      }
    }
  }

  // 3. Etiquetas (reaproveita por nome; cria as que faltam em nome do dono do token)
  progress(3, 7, 'Etiquetas')
  for (const tag of bundle.tags) {
    const existingId = targetTagByName.get(tag.name)
    if (existingId) {
      idMap.tags[tag.source_id] = existingId
      continue
    }
    try {
      const createdTag = await gw.post<Raw>('/tags', compact({ name: tag.name, color: tag.color }))
      idMap.tags[tag.source_id] = String(createdTag.id)
      targetTagByName.set(tag.name, String(createdTag.id))
      created.new_tags++
    } catch (err) {
      fail('tag', tag.source_id, err)
    }
  }

  // 4. Sprints + colunas. O sprint-service cria 4 colunas padrão: reaproveita-as
  //    (renomeia/reposiciona), cria as que faltam e remove as que sobram.
  progress(4, 7, 'Sprints e colunas')
  for (const sp of bundle.sprints) {
    let sprintId: string
    try {
      const createdSprint = await gw.post<Raw>(
        '/sprints',
        compact({
          projectId,
          name: sp.name,
          description: sp.description,
          status: sp.status,
          startDate: sp.start_date,
          endDate: sp.end_date,
          createdBy: target.userId,
        }),
      )
      sprintId = String(createdSprint.id)
      idMap.sprints[sp.source_id] = sprintId
      created.sprints++
    } catch (err) {
      fail('sprint', sp.source_id, err)
      continue
    }

    if (sp.qualidade != null || sp.dificuldade != null) {
      await gw
        .patch(`/sprints/${sprintId}`, compact({ qualidade: sp.qualidade, dificuldade: sp.dificuldade }))
        .catch(err => fail('sprint_evaluation', sp.source_id, err))
    }

    const defaults = (await gw.get<Raw[]>(`/sprints/${sprintId}/columns`)).sort((a, b) => Number(a.position) - Number(b.position))
    for (const [i, col] of sp.columns.entries()) {
      try {
        const reuse = defaults[i]
        if (reuse) {
          await gw.patch(`/sprints/${sprintId}/columns/${reuse.id}`, { title: col.title, position: col.position })
          idMap.columns[col.source_id] = String(reuse.id)
        } else {
          const createdCol = await gw.post<Raw>(`/sprints/${sprintId}/columns`, { title: col.title, position: col.position })
          idMap.columns[col.source_id] = String(createdCol.id)
        }
        created.columns++
      } catch (err) {
        fail('column', col.source_id, err)
      }
    }
    for (const extra of defaults.slice(sp.columns.length)) {
      await gw.delete(`/sprints/${sprintId}/columns/${extra.id}`).catch(err => fail('default_column_cleanup', String(extra.id), err))
    }
  }

  // 5. Tarefas
  progress(5, 7, `Tarefas (${bundle.tasks.length})`)
  const columnsBySprint = new Map<string, string[]>()
  for (const sp of bundle.sprints) {
    columnsBySprint.set(sp.source_id, sp.columns.map(c => idMap.columns[c.source_id]).filter(Boolean))
  }

  const createTask = async (task: BundleTask): Promise<string | null> => {
    let sprintId = task.source_sprint_id ? idMap.sprints[task.source_sprint_id] : undefined
    let columnId = task.source_column_id ? idMap.columns[task.source_column_id] : undefined
    if (task.source_sprint_id && !sprintId) {
      report.skipped.push({ entity: 'task_placement', source_id: task.source_id, message: 'sprint não foi criada — tarefa vai para o backlog' })
      columnId = undefined
    } else if (sprintId && !columnId) {
      columnId = columnsBySprint.get(task.source_sprint_id!)?.[0]
      if (!columnId) {
        report.skipped.push({ entity: 'task_placement', source_id: task.source_id, message: 'sprint sem colunas — tarefa vai para o backlog' })
        sprintId = undefined
      }
    }
    try {
      const card = await gw.post<Raw>(
        '/cards',
        compact({
          projectId,
          sprintId,
          sprintColumnId: sprintId ? columnId : undefined,
          title: task.title,
          description: task.description,
          priority: task.priority,
          color: task.color,
          position: task.position,
          sprintPosition: sprintId ? task.sprint_position : undefined,
          startDate: task.start_date,
          endDate: task.end_date,
        }),
      )
      const taskId = String(card.id)
      idMap.tasks[task.source_id] = taskId
      created.tasks++
      return taskId
    } catch (err) {
      fail('task', task.source_id, err)
      return null
    }
  }

  let doneTasks = 0
  await mapLimit(bundle.tasks, WRITE_CONCURRENCY, async task => {
    const taskId = await createTask(task)
    doneTasks++
    if (doneTasks % 20 === 0) progress(5, 7, `Tarefas (${doneTasks}/${bundle.tasks.length})`)
    if (!taskId) return

    // 6. Etiquetas e responsáveis da tarefa
    for (const sourceTagId of task.source_tag_ids) {
      const tagId = idMap.tags[sourceTagId]
      if (!tagId) continue
      try {
        await gw.post(`/cards/${taskId}/tags/${tagId}`)
        created.tag_links++
      } catch (err) {
        fail('tag_link', `${task.source_id}:${sourceTagId}`, err)
      }
    }
    for (const r of task.responsibles) {
      const userId = userMap.get(r.source_user_id)
      if (!userId) continue
      try {
        await gw.post(`/cards/${taskId}/responsibles/${userId}`)
        created.responsibles++
      } catch (err) {
        fail('responsible', `${task.source_id}:${r.source_user_id}`, err)
      }
    }

    // 7. Comentários, em ordem cronológica dentro da tarefa
    if (includeComments) {
      for (const c of task.comments) {
        if (!c.content.trim()) continue
        try {
          await gw.post(`/cards/${taskId}/comments`, compact({ content: `${commentHeader(c.author, c.created_at)}\n\n${c.content}`, type: c.type }))
          created.comments++
        } catch (err) {
          fail('comment', task.source_id, err)
        }
      }
    }
  })

  progress(7, 7, 'Concluído')
  return report
}
