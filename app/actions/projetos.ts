'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { projectsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'
import { isProjectManager, setProjectManagerRole, removeProjectRole } from '@/services/projectRoleService'

async function upsertDepartamentos(tenantId: string, names: string[]) {
  for (const deptName of names) {
    const name = deptName.trim()
    if (!name) continue
    const existing = await prisma.department.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true, deletedAt: true },
    })
    if (!existing) {
      await prisma.department.create({ data: { tenantId, name } })
    } else if (existing.deletedAt !== null) {
      await prisma.department.update({ where: { id: existing.id }, data: { deletedAt: null } })
    }
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
    }

    if (macroFases && macroFases.length > 0) {
      await projectsApi.upsertMacroFases(projeto.id as string, macroFases)
    }

    if (rest.departamentos && rest.departamentos.length > 0) {
      await upsertDepartamentos(tenantId, rest.departamentos)
    }

    revalidatePath('/projetos')
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
    await verifySession()
    const projeto = await projectsApi.get(id)
    if (!projeto) return { error: 'Projeto não encontrado' }
    return { projeto }
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
    const { ano: anoRaw, macroFases, startDate, endDate, ...rest } = data
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
    }

    const departamentos = rest.departamentos as string[] | undefined
    if (departamentos && departamentos.length > 0) {
      await upsertDepartamentos(tenantId, departamentos)
    }

    revalidatePath('/projetos')
    revalidatePath(`/projetos/${id}`)
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? (err.message || 'Erro ao atualizar projeto') : 'Erro ao atualizar projeto' }
  }
}

export async function deleteProjetoAction(id: string) {
  try {
    await verifySession()
    await projectsApi.delete(id)
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
    phone?: string
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    notes?: string
    hourlyRate?: number | string
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

    const { isGerente: makeGerente, cargos, departamento, hourlyRate: rawRate, name, email, ...profileData } = data

    let hourlyRate: number | undefined
    if (rawRate !== undefined) {
      const n = typeof rawRate === 'string'
        ? parseFloat(rawRate.replace(/\./g, '').replace(',', '.'))
        : rawRate
      if (!isNaN(n)) hourlyRate = n
    }

    // 1. Update User profile via Prisma (name/email only for admin)
    const userUpdateData: Record<string, unknown> = { ...profileData }
    if (isAdmin) {
      if (name?.trim()) userUpdateData.name = name.trim()
      if (email?.trim()) userUpdateData.email = email.trim()
    }
    if (hourlyRate !== undefined) userUpdateData.hourlyRate = hourlyRate

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
