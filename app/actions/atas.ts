'use server'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { requireProjectPermission as exigirPermissao } from '@/services/projectAccess'
import {
  excluirAta,
  submeterDocumento,
} from '@/services/documentRevisionService'
import {
  CriarAtaSchema,
  AtualizarAtaSchema,
  type CriarAtaInput,
  type AtualizarAtaInput,
} from '@/lib/validation/ataSchemas'

export async function criarAtaAction(input: CriarAtaInput) {
  try {
    const s = await verifySession()
    const { projetoId, ...payload } = CriarAtaSchema.parse(input)
    const id = randomUUID()
    const version = await submeterDocumento(
      s,
      projetoId,
      'ATA',
      payload,
      {
        commitTitle: 'Nova ata de reunião',
        versao: '1',
        elaboradoPor: payload.elaboradoPor,
        aprovadoPor: payload.aprovadoPor ?? '',
        dataAprovacao: '',
      },
      id,
    )
    revalidatePath(`/projetos/${projetoId}/atas`)
    revalidatePath(`/projetos/${projetoId}/documentacao`)
    return { success: true, id, status: version.status }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar ata' }
  }
}
export async function atualizarAtaAction(
  ataId: string,
  projetoId: string,
  input: AtualizarAtaInput,
) {
  try {
    const s = await verifySession()
    await exigirPermissao(s, projetoId, 'documentos:editar')
    const ata = await prisma.ata.findFirst({
      where: { id: ataId, projetoId, tenantId: s.tenantId, deletedAt: null },
    })
    if (!ata) throw new Error('Ata não encontrada')
    const payload = AtualizarAtaSchema.parse(input)
    const version = await submeterDocumento(
      s,
      projetoId,
      'ATA',
      payload,
      {
        commitTitle: `Alteração da ata ${ata.numero}`,
        versao: new Date().toISOString(),
        elaboradoPor: payload.elaboradoPor,
        aprovadoPor: payload.aprovadoPor ?? '',
        dataAprovacao: '',
      },
      ataId,
    )
    revalidatePath(`/projetos/${projetoId}/atas`)
    revalidatePath(`/projetos/${projetoId}/documentacao`)
    return { success: true, status: version.status }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar ata' }
  }
}
export async function removerAtaAction(ataId: string, projetoId: string) {
  try {
    const s = await verifySession()
    await exigirPermissao(s, projetoId, 'documentos:excluir')
    await excluirAta(s, projetoId, ataId)
    revalidatePath(`/projetos/${projetoId}/atas`)
    revalidatePath(`/projetos/${projetoId}/documentacao`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao remover ata' }
  }
}
