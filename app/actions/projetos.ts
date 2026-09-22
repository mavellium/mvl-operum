'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { projectsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'
import { isProjectManager, setProjectManagerRole, removeProjectRole } from '@/services/projectRoleService'
import { getTree, syncMacrofasesComEap } from '@/services/wbsService'
import { computarPlanilhaCustos, type Elaborador } from '@/lib/planilhaCustos'
import { validateAvatarUrl } from '@/lib/validation/avatarUrl'

/**
 * Garante que o catálogo (Department) tenha os departamentos escolhidos e
 * sincroniza as associações reais (ProjetoDepartamento) do projeto com essa
 * seleção — o form de projeto agora fica conectado ao cadastro global.
 */
async function syncProjetoDepartamentos(projetoId: string, tenantId: string, names: string[]) {
  const uniqueNames = [...new Set(names.map(n => n.trim()).filter(Boolean))]

  // Resolve (ou cria) cada departamento no catálogo global do tenant.
  const departmentIds: string[] = []
  for (const name of uniqueNames) {
    const existing = await prisma.department.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
    })
    let dept = existing
    if (!dept) {
      dept = await prisma.department.create({ data: { tenantId, name } })
    } else if (dept.deletedAt !== null) {
      dept = await prisma.department.update({ where: { id: dept.id }, data: { deletedAt: null } })
    }
    departmentIds.push(dept.id)
  }

  const current = await prisma.projetoDepartamento.findMany({
    where: { projetoId },
    select: { id: true, departamentoId: true },
  })
  const currentIds = new Set(current.map(c => c.departamentoId))
  const desired = new Set(departmentIds)

  const toCreate = departmentIds.filter(id => !currentIds.has(id))
  const toDelete = current.filter(c => !desired.has(c.departamentoId))

  if (toCreate.length > 0) {
    await prisma.projetoDepartamento.createMany({
      data: toCreate.map(departamentoId => ({ projetoId, departamentoId })),
      skipDuplicates: true,
    })
  }
  if (toDelete.length > 0) {
    await prisma.projetoDepartamento.deleteMany({
      where: { projetoId, departamentoId: { in: toDelete.map(d => d.departamentoId) } },
    })
  }
}

export async function createProjetoAction(
  _prevState: unknown,
  input: {
    name: string
    description?: string
    initialMemberId?: string
    startDate?: string
    endDate?: string
    location?: string
    logoUrl?: string
    slogan?: string
    justificativa?: string
    objetivos?: string
    metodologia?: string
    descricaoProduto?: string
    premissas?: string
    restricoes?: string
    limitesAutoridade?: string
    semestre?: string
    ano?: string
    departamentos?: string[]
    macroFases?: Array<{ fase: string; dataLimite: string; custo: string }>
  },
) {
  try {
    const { tenantId } = await verifySession()
    const { initialMemberId, ano: anoStr, macroFases, startDate, endDate, ...rest } = input
    const ano = anoStr ? Number(anoStr) : undefined
    const toISO = (d?: string) => d ? new Date(d).toISOString() : undefined

    const projeto = await projectsApi.create({
      ...rest,
      tenantId,
      ano,
      startDate: toISO(startDate),
      endDate: toISO(endDate),
    }) as Record<string, unknown>

    if (initialMemberId) {
      await projectsApi.addMember(projeto.id as string, { userId: initialMemberId })
      // Vincula de verdade o papel de Gerente de Projeto (UserProjectRole) —
      // antes só criava o membro e a função desaparecia nos stakeholders.
      await setProjectManagerRole(initialMemberId, projeto.id as string, tenantId)
      // O novo membro pode estar parado em /no-project — libera o gate dele.
      revalidatePath('/no-project')
      revalidatePath('/')
    }

    if (macroFases && macroFases.length > 0) {
      await projectsApi.upsertMacroFases(projeto.id as string, macroFases)
      // Sincroniza macrofases do form com a árvore WBS/EAP (top-level nodes) —
      // torna a EAP e a Planilha de Custos coerentes com o Cronograma do form.
      const { userId } = await verifySession()
      await syncMacrofasesComEap(projeto.id as string, tenantId, macroFases, userId)
    }

    if (rest.departamentos && rest.departamentos.length > 0) {
      await syncProjetoDepartamentos(projeto.id as string, tenantId, rest.departamentos)
    }

    revalidatePath('/projetos')
    revalidatePath(`/projetos/${projeto.id}/wbs`)
    revalidatePath(`/projetos/${projeto.id}/planilha-custos`)
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? (err.message || 'Erro ao criar projeto') : 'Erro ao criar projeto' }
  }
}

export async function getProjetosAction(): Promise<{ id: string; name: string }[]> {
  try {
    const result = await projectsApi.list()
    return result.items
  } catch {
    return []
  }
}

export async function getProjetoAction(id: string) {
  try {
    const { tenantId } = await verifySession()
    const projeto = await projectsApi.get(id)
    if (!projeto) return { error: 'Projeto não encontrado' }
    const associados = await prisma.projetoDepartamento.findMany({
      where: { projetoId: id },
      select: { department: { select: { id: true, name: true } } },
    })
    const gerente = await prisma.userProjectRole.findFirst({
      where: {
        projectId: id,
        deletedAt: null,
        role: { is: { nameKey: 'gerente', scope: 'PROJETO' } },
      },
      select: { userId: true },
    })

    // Fonte única de macrofases = árvore WBS top-level (EAP/Planilha).
    // Fallback: ProjectMacroFase (projetos legados sem árvore).
    let macroFasesFromTree: Array<{ fase: string; dataLimite: string; custo: string }> | null = null
    const tree = await getTree(id, tenantId)
    if (tree.rootId && tree.nodes[tree.rootId]) {
      const topLevelIds = tree.nodes[tree.rootId].childrenIds
      if (topLevelIds.length > 0) {
        macroFasesFromTree = topLevelIds.map(faseId => {
          const fase = tree.nodes[faseId]
          const props = (fase?.properties as Record<string, any>) ?? {}
          return {
            fase: fase?.title ?? '',
            dataLimite: props.dataLimite ?? '',
            custo: props.custo != null ? String(props.custo) : '',
          }
        }).filter(f => f.fase)
      }
    }

    return {
      projeto: {
        ...projeto,
        macroFases: macroFasesFromTree ?? projeto.macroFases ?? [],
      },
      departamentosAssociados: associados.map(a => a.department),
      gerenteId: gerente?.userId ?? '',
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar projeto' }
  }
}

export async function updateProjetoAction(
  _prevState: unknown,
  id: string,
  data: Record<string, unknown> & { ano?: string | number; macroFases?: Array<{ fase: string; dataLimite: string; custo: string }> },
) {
  try {
    const { tenantId } = await verifySession()
    const { ano: anoRaw, macroFases, startDate, endDate, initialMemberId, ...rest } = data
    const ano = anoRaw !== undefined && anoRaw !== '' ? Number(anoRaw) : undefined
    const toISO = (d: unknown) => (typeof d === 'string' && d) ? new Date(d).toISOString() : undefined
    const projeto = await projectsApi.update(id, {
      ...rest,
      ...(ano !== undefined && { ano }),
      ...(startDate !== undefined && { startDate: toISO(startDate) }),
      ...(endDate !== undefined && { endDate: toISO(endDate) }),
    })

    if (macroFases) {
      await projectsApi.upsertMacroFases(id, macroFases)
      // Sincroniza macrofases do form com a árvore WBS/EAP (bidirecional)
      const { userId } = await verifySession()
      await syncMacrofasesComEap(id, tenantId, macroFases, userId)
    }

    const departamentos = rest.departamentos as string[] | undefined
    if (departamentos) {
      // Mantém o catálogo e as associações reais em sincronia com o form.
      await syncProjetoDepartamentos(id, tenantId, departamentos)
    }

    // Gerente do Projeto: troca o responsável (ou remove quando "Ainda não definido")
    if (initialMemberId !== undefined) {
      if (initialMemberId) {
        const gerenteUserId = initialMemberId as string
        await projectsApi.addMember(id, { userId: gerenteUserId })
        await setProjectManagerRole(gerenteUserId, id, tenantId)
        revalidatePath('/no-project')
      } else {
        const gerente = await prisma.userProjectRole.findFirst({
          where: {
            projectId: id,
            deletedAt: null,
            role: { is: { nameKey: 'gerente', scope: 'PROJETO' } },
          },
        })
        if (gerente) await removeProjectRole(gerente.userId, id)
      }
    }

    revalidatePath('/projetos')
    revalidatePath(`/projetos/${id}`)
    revalidatePath(`/projetos/${id}/wbs`)
    revalidatePath(`/projetos/${id}/planilha-custos`)
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? (err.message || 'Erro ao atualizar projeto') : 'Erro ao atualizar projeto' }
  }
}

export async function deleteProjetoAction(id: string) {
  try {
    const { tenantId } = await verifySession()

    // projectsApi.delete chama o project-service, que escopa por x-tenant-id
    // (project.service.ts remove -> findOne) e lança NotFoundException se o
    // projeto não pertencer ao tenant do usuário — não precisa revalidar aqui.
    await projectsApi.delete(id)

    // O delete do projeto é soft (deletedAt); rascunhos não têm cascade e reapareceriam
    // no formulário de "novo projeto"/edição se não forem limpos aqui. O filtro por
    // tenantId torna essa limpeza inofensiva mesmo que `id` não pertença a este tenant.
    await prisma.projectDraft.deleteMany({ where: { projectId: id, tenantId } })
    revalidatePath('/projetos')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar projeto' }
  }
}

export async function addMemberAction(projetoId: string, userId: string) {
  try {
    await verifySession()
    await projectsApi.addMember(projetoId, { userId })
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    // O membro adicionado pode estar parado em /no-project — libera o gate dele.
    revalidatePath('/no-project')
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar membro' }
  }
}

export async function removeMemberAction(projetoId: string, userId: string) {
  try {
    await verifySession()
    await projectsApi.removeMember(projetoId, userId)
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover membro' }
  }
}

export async function getMembrosAction(projetoId: string) {
  try {
    await verifySession()
    return await projectsApi.getMembers(projetoId)
  } catch {
    return []
  }
}

export async function updateUsuarioProjetoAction(
  userId: string,
  projetoId: string,
  data: {
    projectRole?: string
    cargos?: string[]
    departamentos?: string[]
    hourlyRate?: number | null
    active?: boolean
  },
) {
  try {
    const { tenantId } = await verifySession()
    await projectsApi.addMember(projetoId, { userId, ...data, tenantId })
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    revalidatePath('/admin/users')
    // O vínculo do usuário mudou (ativado/desativado) — libera o gate dele.
    revalidatePath('/no-project')
    revalidatePath('/')
    return { membro: { userId, projetoId } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar membro' }
  }
}

export async function updateProjetoMemberAction(
  userId: string,
  projetoId: string,
  data: {
    name?: string
    email?: string
    avatarUrl?: string
    phone?: string
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    notes?: string
    remuneracao?: number | string
    horasDiarias?: number | string
    hourlyRate?: number
    cargos?: string[]
    departamento?: string[]
    isGerente?: boolean
  },
) {
  try {
    const { role, tenantId, userId: sessionUserId } = await verifySession()
    const isAdmin = role === 'admin'
    const canManage = isAdmin || await isProjectManager(sessionUserId, projetoId)
    if (!canManage) throw new Error('Acesso não autorizado')

    const { isGerente: makeGerente, cargos, departamento, remuneracao: rawRemuneracao, horasDiarias: rawHorasDiarias, hourlyRate: rawHourlyRate, name, email, ...profileData } = data

    let remuneracao: number | undefined
    if (rawRemuneracao !== undefined) {
      const n = typeof rawRemuneracao === 'string'
        ? parseFloat(rawRemuneracao.replace(/\./g, '').replace(',', '.'))
        : rawRemuneracao
      if (!isNaN(n)) remuneracao = n
    }

    let horasDiarias: number | undefined
    if (rawHorasDiarias !== undefined) {
      const h = Number(rawHorasDiarias)
      if (!isNaN(h) && h > 0) horasDiarias = h
    }

    const derivedHourlyRate =
      remuneracao !== undefined && horasDiarias !== undefined
        ? remuneracao / 30 / horasDiarias
        : undefined

    let directHourlyRate: number | undefined
    if (rawHourlyRate !== undefined) {
      const hr = Number(rawHourlyRate)
      if (!isNaN(hr) && hr > 0 && hr < 1_000_000) directHourlyRate = hr
    }
    // Alguns formulários (ex.: edição de membro em ProjetoMembrosClient) enviam
    // hourlyRate direto em vez de remuneracao+horasDiarias — respeita esse valor quando presente.
    const hourlyRate = directHourlyRate !== undefined ? directHourlyRate : derivedHourlyRate

    // 1. Update User profile via Prisma (name/email only for admin)
    const userUpdateData: Record<string, unknown> = { ...profileData }
    if ('avatarUrl' in profileData) {
      userUpdateData.avatarUrl = validateAvatarUrl(profileData.avatarUrl)
    }
    if (isAdmin) {
      if (name?.trim()) userUpdateData.name = name.trim()
      if (email?.trim()) userUpdateData.email = email.trim()
    }
    await prisma.user.update({
      where: { id: userId, tenantId, deletedAt: null },
      data: userUpdateData,
    })

    // 2a. Upsert cargos — sequential to avoid race conditions; upsert handles soft-deleted records
    if (cargos !== undefined && cargos.length > 0) {
      for (const cargoName of cargos) {
        const name = cargoName.trim()
        if (!name) continue
        const byName = await prisma.role.findFirst({
          where: { tenantId, name: { equals: name, mode: 'insensitive' } },
          select: { id: true, deletedAt: true },
        })
        if (byName) {
          if (byName.deletedAt !== null) {
            await prisma.role.update({ where: { id: byName.id }, data: { deletedAt: null } })
          }
        } else {
          const nameKey = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          await prisma.role.upsert({
            where: { nameKey_tenantId_scope: { nameKey, tenantId, scope: 'TENANT' } },
            create: { tenantId, name, nameKey, scope: 'TENANT' },
            update: { name, deletedAt: null },
          })
        }
      }
    }

    // 2b. Upsert department — case-insensitive name search, resolve id
    let deptId: string | null | undefined
    if (departamento !== undefined) {
      if (departamento.length > 0) {
        const deptName = departamento[0].trim()
        const byName = await prisma.department.findFirst({
          where: { tenantId, name: { equals: deptName, mode: 'insensitive' } },
          select: { id: true, deletedAt: true },
        })
        if (byName) {
          if (byName.deletedAt !== null) {
            await prisma.department.update({ where: { id: byName.id }, data: { deletedAt: null } })
          }
          deptId = byName.id
        } else {
          const created = await prisma.department.create({
            data: { name: deptName, tenantId },
            select: { id: true },
          })
          deptId = created.id
        }
      } else {
        deptId = null
      }
    }

    // 2c. Update UserProject
    const userProjectData: Record<string, unknown> = {}
    if (cargos !== undefined) userProjectData.role = cargos.join(', ')
    if (remuneracao !== undefined) userProjectData.remuneracao = remuneracao
    if (horasDiarias !== undefined) userProjectData.horasDiarias = horasDiarias
    if (hourlyRate !== undefined) userProjectData.hourlyRate = hourlyRate
    if (deptId !== undefined) userProjectData.departmentId = deptId

    if (Object.keys(userProjectData).length > 0) {
      await prisma.userProject.update({
        where: { userId_projectId: { userId, projectId: projetoId } },
        data: userProjectData,
      })
    }

    // 3. Handle gerente role via projectRoleService (uses correct role cuid)
    if (makeGerente === true) {
      await setProjectManagerRole(userId, projetoId, tenantId)
    } else if (makeGerente === false) {
      await removeProjectRole(userId, projetoId)
    }

    revalidatePath(`/projetos/${projetoId}/stakeholders`)
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar membro' }
  }
}

export async function getUserProjetosAction(userId: string) {
  try {
    await verifySession()
    return await projectsApi.getUserProjects(userId)
  } catch {
    return []
  }
}
