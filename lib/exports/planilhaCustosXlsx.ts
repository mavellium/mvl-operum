import ExcelJS from 'exceljs'
import type { PlanilhaResult, PlanilhaRow } from '@/lib/custosCalc'

export interface PlanilhaExportMeta {
  nomeProjeto: string
  valorPorMinuto: number
  horasPorDia: number
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export async function gerarPlanilhaXlsx(
  result: PlanilhaResult,
  meta: PlanilhaExportMeta,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Planilha de Custos')
  ws.views = [{ state: 'frozen', ySplit: 2 }]

  const confHeader = [
    `Projeto: ${meta.nomeProjeto}`,
    `Valor da hora: ${brl(meta.valorPorMinuto * 60)} (${brl(meta.valorPorMinuto)}/min) — ${meta.horasPorDia}h/dia`,
  ]
  const confRow = ws.addRow(confHeader)
  confRow.font = { bold: true, size: 12 }
  ws.mergeCells(`A1:I1`)
  ws.mergeCells(`A2:I2`)
  confRow.height = 20

  const headers = ['Código', 'Título da Edl', 'Unid.', 'Qtd.', 'Situação', 'Data Início', 'Data Fim', 'Custo Previsto', 'Custo Real']
  const headerRow = ws.addRow(headers)
  headerRow.height = 22
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e40af' } }
    c.font = { bold: true, color: { argb: 'FFFFFF' } }
    c.border = { bottom: { style: 'thin', color: { argb: '000000' } } }
  })

  const rows: PlanilhaRow[] = result.rows
  rows.forEach(r => {
    const row = ws.addRow([
      r.codigo,
      (r.éFolha ? r.titulo : `» ${r.titulo}`),
      r.unidade,
      r.quantidade,
      r.situacao,
      r.dataInicio ?? '',
      r.dataFim ?? '',
      r.custoPrevisto,
      r.custoReal,
    ])
    if (!r.éFolha) {
      row.font = { bold: true }
    } else {
      row.eachCell(c => {
        c.numFmt = Number(c.col) === 8 || Number(c.col) === 9 ? '"R$" #,##0.00' : c.numFmt
      })
    }
  })

  const totalRow = ws.addRow([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    result.totalPrevisto,
    result.totalReal,
  ])
  totalRow.font = { bold: true, size: 12 }
  totalRow.eachCell(c => {
    if (Number(c.col) === 8 || Number(c.col) === 9) {
      c.numFmt = '"R$" #,##0.00'
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } }
    }
  })

  const widths = [14, 40, 8, 10, 22, 14, 14, 16, 16]
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
