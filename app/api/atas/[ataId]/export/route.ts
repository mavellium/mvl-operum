import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { buscarAta } from '@/services/ataService'
import { gerarAtaDocx, type AtaExportData } from '@/lib/exports/ataDocx'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ataId: string }> },
) {
  const { ataId } = await params

  try {
    const session = await verifySession()
    const ata = await buscarAta(session.tenantId, ataId)
    if (!ata) {
      return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 })
    }

    const data: AtaExportData = {
      numero: ata.numero,
      nomeProjeto: ata.nomeProjeto,
      local: ata.local,
      data: ata.data,
      elaboradoPor: ata.elaboradoPor,
      aprovadoPor: ata.aprovadoPor,
      assuntosTratados: ata.assuntosTratados,
      decisoesTomadas: ata.decisoesTomadas,
      observacoes: ata.observacoes,
      copiasPara: ata.copiasPara,
      presentes: ata.presentes.map(p => ({ nome: p.nome, setorEmpresa: p.setorEmpresa })),
      acoes: ata.acoes.map(a => ({ acao: a.acao, prazo: a.prazo, responsavel: a.responsavel })),
      anexos: ata.anexos.map(a => ({ nome: a.nome, url: a.url })),
    }

    const buffer = await gerarAtaDocx(data)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="ata-${String(ata.numero).padStart(2, '0')}-${ata.nomeProjeto.replace(/\s+/g, '-').toLowerCase()}.docx"`,
      },
    })
  } catch (err) {
    console.error('[atas export GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
