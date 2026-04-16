'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import {
  createProject,
  findAllByTenant,
  findById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getMembersWithDetails,
  updateUserProject,
  getUserProjectsWithDetails
} from '@/services/projectService'
import { setProjectManagerRole, removeProjectRole, countProjectManagers } from '@/services/projectRoleService'
import { getOrCreateRole } from '@/services/roleService'
import prisma from '@/lib/prisma'
import type { UpdateProjectInput, MacroFaseInput } from '@/lib/validation/projectSchemas'

export async function createProjetoAction(
  _prevState: unknown,
  input: {
    name: string;
    description?: string;
    initialMemberId?: string;
    // --- Novos Campos do TAP (Termo de Abertura do Projeto) ---
    startDate?: string;
    endDate?: string;
    location?: string;
    logoUrl?: string;
    slogan?: string;
    justificativa?: string;
    objetivos?: string;
    metodologia?: string;
    descricaoProduto?: string;
    premissas?: string;
    restricoes?: string;
    limitesAutoridade?: string;
    semestre?: string;
    ano?: string;
    departamentos?: string[];
    macroFases?: Array<{ fase: string; dataLimite: string; custo: string }>;
  }
) {
  try {
    const { tenantId } = await verifySession()

    // Separamos o initialMemberId do restante dos dados que vão para a tabela Project
    const { initialMemberId, ano: anoStr, ...projectData } = input
    const ano = anoStr ? Number(anoStr) : undefined

    // Passamos todos os dados do projeto para o Service
    const projeto = await createProject({
      ...projectData,
      tenantId,
      ano,
    })

    // Se o gerente foi selecionado na UI, fazemos a vinculação
    if (initialMemberId) {
      await addMember(projeto.id, initialMemberId)
      await setProjectManagerRole(initialMemberId, projeto.id, tenantId)
    }

    revalidatePath('/projetos')
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar projeto' }
  }
}

export async function getProjetosAction() {
  try {
    const { tenantId } = await verifySession()
    return await findAllByTenant(tenantId)
  } catch {
    return []
  }
}

export async function getProjetoAction(id: string) {
  try {
    await verifySession()
    const projeto = await findById(id)
    if (!projeto) {
      return { error: 'Projeto não encontrado' }
    }
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar projeto' }
  }
}

export async function updateProjetoAction(
  _prevState: unknown,
  id: string,
  data: Omit<UpdateProjectInput, 'ano'> & { ano?: string | number } & { macroFases?: MacroFaseInput[] },
) {
  try {
    await verifySession()
    const { ano: anoRaw, ...rest } = data
    const ano = anoRaw !== undefined && anoRaw !== '' ? Number(anoRaw) : undefined
    const projeto = await updateProject(id, { ...rest, ano })
    revalidatePath('/projetos')
    revalidatePath(`/projetos/${id}`)
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar projeto' }
  }
}

export async function deleteProjetoAction(id: string) {
  try {
    await verifySession()
    await deleteProject(id)
    revalidatePath('/projetos')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar projeto' }
  }
}

export async function addMemberAction(projetoId: string, userId: string) {
  try {
    await verifySession()
    await addMember(projetoId, userId)
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
    await removeMember(projetoId, userId)
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
    return await getMembersWithDetails(projetoId)
  } catch {
    return []
  }
}

export async function updateUsuarioProjetoAction(
  userId: string,
  projetoId: string,
  data: {
    projectRole?: string;
    cargos?: string[];
    departamentos?: string[];
    hourlyRate?: number | null;
    active?: boolean
  },
) {
  try {
    const { tenantId } = await verifySession()
    const { cargos, departamentos, ...rest } = data

    // Persist each cargo name to the Role table (find-or-create)
    if (cargos && cargos.length > 0) {
      await Promise.all(cargos.map(name => getOrCreateRole(name, tenantId)))
    }

    // Resolve department name → ID (find-or-create)
    let departmentId: string | null | undefined = undefined
    const deptName = departamentos?.[0]?.trim()
    if (deptName) {
      const dept = await prisma.department.upsert({
        where: { name_tenantId: { name: deptName, tenantId } },
        update: {},
        create: { name: deptName, tenantId },
        select: { id: true },
      })
      departmentId = dept.id
    } else if (departamentos !== undefined) {
      departmentId = null
    }

    const membro = await updateUserProject(userId, projetoId, {
      ...rest,
      roles: cargos,
      ...(departmentId !== undefined && { departmentId }),
      tenantId,
    })
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    revalidatePath('/admin/users')
    return { membro }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar membro' }
  }
}

export async function updateProjetoMemberAction(
  userId: string,
  projetoId: string,
  data: {
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
    const { tenantId } = await verifySession()

    // 1. Atualizar dados globais do usuário
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.cep !== undefined && { cep: data.cep }),
        ...(data.logradouro !== undefined && { logradouro: data.logradouro }),
        ...(data.numero !== undefined && { numero: data.numero }),
        ...(data.complemento !== undefined && { complemento: data.complemento }),
        ...(data.bairro !== undefined && { bairro: data.bairro }),
        ...(data.cidade !== undefined && { cidade: data.cidade }),
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    // 2. Resolver departamento (find-or-create)
    let departmentId: string | undefined

    if (data.departamento && data.departamento.length > 0) {
      const deptName = data.departamento[0].trim()

      const dept = await prisma.department.upsert({
        where: { name_tenantId: { name: deptName, tenantId } },
        update: {},
        create: { name: deptName, tenantId },
        select: { id: true },
      })

      departmentId = dept.id
    } else if (data.departamento !== undefined) {
      departmentId = undefined
    }

    // 2b. Persistir cada cargo na tabela Role (find-or-create)
    if (data.cargos && data.cargos.length > 0) {
      await Promise.all(data.cargos.map(name => getOrCreateRole(name, tenantId)))
    }

    // 3. Atualizar UserProject (role = cargos.join(', '), departmentId, hourlyRate)
    const existing = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId: projetoId } },
    })
    if (!existing) throw new Error('Membro não encontrado no projeto')

    let parsedHourlyRate: number | undefined
    if (data.hourlyRate !== undefined) {
      if (typeof data.hourlyRate === 'string') {
        const clean = data.hourlyRate.replace(/\./g, '').replace(',', '.')
        const n = parseFloat(clean)
        parsedHourlyRate = isNaN(n) ? undefined : n
      } else {
        parsedHourlyRate = data.hourlyRate
      }
    }

    await prisma.userProject.update({
      where: { id: existing.id },
      data: {
        ...(data.cargos !== undefined && {
          role: data.cargos.length > 0 ? data.cargos.join(', ') : null,
        }),
        ...(departmentId !== undefined && { departmentId }),
        ...(parsedHourlyRate !== undefined && { hourlyRate: parsedHourlyRate }),
      },
    })

    // 4. Gerenciar role de gerente via UserProjectRole
    if (data.isGerente === true) {
      await setProjectManagerRole(userId, projetoId, tenantId)
    } else if (data.isGerente === false) {
      const isCurrentlyGerente = await prisma.userProjectRole.findFirst({
        where: { userId, projectId: projetoId, deletedAt: null },
      })
      if (isCurrentlyGerente) {
        const count = await countProjectManagers(projetoId)
        if (count <= 1) {
          throw new Error('Não é possível remover o único gerente do projeto')
        }
        await removeProjectRole(userId, projetoId)
      }
    }

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
    const rows = await getUserProjectsWithDetails(userId)
    return rows.map(r => ({
      ...r,
      cargo: r.role ?? null,
      departamento: null as string | null,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate?.toISOString() ?? null,
    }))
  } catch {
    return []
  }
}