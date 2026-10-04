import prisma from '@/lib/prisma'
import { isTransactionConflict } from '@/lib/transactionConflict'
import { syncMacrofasesComEapInTransaction } from './wbsService'

export const MACRO_FASE_SYNC_PENDING = 'Projeto salvo. A sincronização das macrofases com a EAP está pendente. Tente sincronizar novamente.'

/** Reads the durable latest batch; never retries a stale HTTP payload. */
export async function reconcileMacroFases(projectId: string, tenantId: string, userId?: string) {
  let revision: number | undefined
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const project = await tx.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null }, select: { macroFasesRevision: true, macroFasesSyncedRevision: true } })
        if (!project) throw new Error('Projeto não encontrado')
        revision = project.macroFasesRevision
        if (revision === project.macroFasesSyncedRevision) return { pending: false }
        const phases = await tx.projectMacroFase.findMany({ where: { projectId }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] })
        await syncMacrofasesComEapInTransaction(tx, projectId, tenantId, phases.map(f => ({ fase: f.fase, dataLimite: f.dataLimite ?? '', custo: f.custo ?? '' })), userId)
        await tx.project.update({ where: { id: projectId }, data: { macroFasesSyncedRevision: revision, macroFasesSyncError: null } })
        return { pending: false }
      }, { isolationLevel: 'Serializable', timeout: 15000 })
    } catch (error) {
      if (isTransactionConflict(error) && attempt < 2) continue
      if (revision === undefined) throw error
      // Best effort diagnostic only: the revision gap itself survives a process crash.
      try {
        await prisma.project.updateMany({ where: { id: projectId, tenantId, deletedAt: null, macroFasesRevision: revision, macroFasesSyncedRevision: { lt: revision } }, data: { macroFasesSyncError: MACRO_FASE_SYNC_PENDING } })
      } catch { /* Never lose the committed batch or obscure its pending status. */ }
      return { pending: true, warning: MACRO_FASE_SYNC_PENDING }
    }
  }
}
