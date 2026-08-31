import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  VerticalAlign,
  Header,
} from 'docx'

type Presente = { nome: string; setorEmpresa: string | null }
type Acao = { acao: string; prazo: Date | null; responsavel: string | null }
type Anexo = { nome: string; url: string | null }

export interface AtaExportData {
  numero: number
  nomeProjeto: string
  local: string | null
  data: Date
  elaboradoPor: string
  aprovadoPor: string | null
  assuntosTratados: string | null
  decisoesTomadas: string | null
  observacoes: string | null
  copiasPara: string[]
  presentes: Presente[]
  acoes: Acao[]
  anexos: Anexo[]
}

const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR')

function labelRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 4000, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 22 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 7600, type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [new TextRun({ text: value, size: 22 })],
          }),
        ],
      }),
    ],
  })
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 26, color: '1e40af' })],
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22 })],
  })
}

export function buildAtaDocx(data: AtaExportData): Document {
  const rows: TableRow[] = [
    labelRow('Número', String(data.numero).padStart(2, '0')),
    labelRow('Projeto', data.nomeProjeto),
    labelRow('Local', data.local ?? '—'),
    labelRow('Data', fmtDate(data.data)),
    labelRow('Elaborado por', data.elaboradoPor),
    labelRow('Aprovado por', data.aprovadoPor ?? '—'),
  ]

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'ATA DE REUNIÃO', bold: true, size: 36, color: '1e40af' })],
    }),
    new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
  ]

  children.push(sectionTitle('I. Relação dos presentes'))
  if (data.presentes.length === 0) {
    children.push(bullet('—'))
  } else {
    data.presentes.forEach(p => children.push(bullet(`${p.nome}${p.setorEmpresa ? ` — ${p.setorEmpresa}` : ''}`)))
  }

  children.push(sectionTitle('II. Assuntos tratados'))
  children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: data.assuntosTratados ?? '—', size: 22 })] }))

  children.push(sectionTitle('III. Decisões tomadas'))
  children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: data.decisoesTomadas ?? '—', size: 22 })] }))

  children.push(sectionTitle('IV. Ações a serem empreendidas'))
  if (data.acoes.length === 0) {
    children.push(bullet('—'))
  } else {
    data.acoes.forEach(a => {
      const prazo = a.prazo ? fmtDate(a.prazo) : '—'
      const resp = a.responsavel ?? '—'
      children.push(bullet(`${a.acao}  (Prazo: ${prazo} — Responsável: ${resp})`))
    })
  }

  children.push(sectionTitle('Documentos anexos'))
  if (data.anexos.length === 0) {
    children.push(bullet('—'))
  } else {
    data.anexos.forEach(a => children.push(bullet(`${a.nome}${a.url ? ` — ${a.url}` : ''}`)))
  }

  children.push(sectionTitle('Enviar cópias para'))
  if (data.copiasPara.length === 0) {
    children.push(bullet('—'))
  } else {
    data.copiasPara.forEach(e => children.push(bullet(e)))
  }

  children.push(sectionTitle('Assinaturas'))
  children.push(new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: '__________________________________', size: 22 }), new TextRun({ text: '        ', size: 22 }), new TextRun({ text: '__________________________________', size: 22 })],
  }))

  children.push(sectionTitle('Observações'))
  children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: data.observacoes ?? '—', size: 22 })] }))

  return new Document({
    creator: 'Operum',
    title: `Ata ${String(data.numero).padStart(2, '0')} — ${data.nomeProjeto}`,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
    },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
        headers: {
          default: new Header({
            children: [new Paragraph({ children: [new TextRun({ text: `${data.nomeProjeto} — Ata ${String(data.numero).padStart(2, '0')}`, italics: true, size: 18, color: '6b7280' })] })],
          }),
        },
        children,
      },
    ],
  })
}

export async function gerarAtaDocx(data: AtaExportData): Promise<Buffer> {
  const doc = buildAtaDocx(data)
  return Packer.toBuffer(doc)
}
