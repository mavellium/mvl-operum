import {
  AlignmentType, BorderStyle, Document, Footer, HeightRule, Packer, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx'

type Presente = { nome: string; setorEmpresa: string | null }
type Acao = { acao: string; prazo: Date | null; responsavel: string | null }
type Anexo = { nome: string; url: string | null }

export interface AtaExportData {
  instituicao?: string | null
  numero: number
  nomeProjeto: string
  local: string | null
  data: Date | null
  elaboradoPor: string | null
  /** Função de quem elaborou ("nome e função" no modelo). */
  elaboradoPorFuncao?: string | null
  aprovadoPor: string | null
  /** Função de quem aprovou ("nome do gerente - função" no modelo). */
  aprovadoPorFuncao?: string | null
  assuntosTratados: string | null
  decisoesTomadas: string | null
  observacoes: string | null
  copiasPara: string[]
  presentes: Presente[]
  acoes: Acao[]
  anexos: Anexo[]
  logoUrl?: string | null
}

// ── Regras do modelo (compartilhadas com a prévia em components/atas/AtaDocument.tsx) ──

export const ATA_RODAPE = '© 01_Form Ata de Reunião'
export const ATA_PLANO_DO_PROJETO = 'Plano do Projeto'
/** Linhas mínimas das tabelas do modelo (presentes e ações). */
export const ATA_MIN_PRESENTES = 7
export const ATA_MIN_ACOES = 6

export const ataNumero = (n: number | null | undefined) => (n ? String(n).padStart(2, '0') : '__')
export const ataData = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '__/__/____')
/** "Nome – função" (ou só o nome). */
export const ataPessoa = (nome: string | null | undefined, funcao?: string | null) =>
  [nome?.trim(), funcao?.trim()].filter(Boolean).join(' – ')
/** Completa a lista com linhas vazias até o mínimo do modelo. */
export function ataPreencher<T>(itens: T[], minimo: number, vazio: T): T[] {
  return itens.length >= minimo ? itens : [...itens, ...Array.from({ length: minimo - itens.length }, () => vazio)]
}
/**
 * Caixas de "Enviar cópias para", como no modelo: grade de 4 colunas em que a 1ª célula
 * é o rótulo; destinatários marcados, caixas vazias e "Plano do Projeto" na última.
 * Retorna só as caixas (sem a célula do rótulo).
 */
export function ataCopias(copias: string[]): Array<{ texto: string; marcado: boolean }> {
  const nomes = copias.map(c => c.trim()).filter(c => c && c.toLowerCase() !== ATA_PLANO_DO_PROJETO.toLowerCase())
  const plano = copias.some(c => c.trim().toLowerCase() === ATA_PLANO_DO_PROJETO.toLowerCase())
  const total = Math.max(12, Math.ceil((nomes.length + 2) / 4) * 4) - 1
  const caixas = nomes.map(texto => ({ texto, marcado: true }))
  while (caixas.length < total - 1) caixas.push({ texto: '', marcado: false })
  caixas.push({ texto: ATA_PLANO_DO_PROJETO, marcado: plano })
  return caixas
}

// ── Word ─────────────────────────────────────────────────────────────────────

const LARGURA = 10206 // A4 retrato com margens de 850
const CINZA = 'BFBFBF'
const CINZA_CLARO = 'E7E6E6'
const linha = { style: BorderStyle.SINGLE, size: 6, color: '000000' }
const bordas = { top: linha, bottom: linha, left: linha, right: linha }
const semBorda = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const semBordas = { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda }

function texto(partes: Array<{ t: string; b?: boolean }>, size = 18): Paragraph[] {
  const linhas: Array<Array<{ t: string; b?: boolean }>> = [[]]
  for (const p of partes) {
    p.t.split('\n').forEach((pedaco, i) => {
      if (i > 0) linhas.push([])
      linhas[linhas.length - 1].push({ t: pedaco, b: p.b })
    })
  }
  return linhas.map(l => new Paragraph({ children: l.map(p => new TextRun({ text: p.t, bold: p.b, size })) }))
}

function celula(
  conteudo: Paragraph[], largura: number,
  opts: { span?: number; cinza?: string; semBorda?: boolean } = {},
): TableCell {
  return new TableCell({
    columnSpan: opts.span,
    width: { size: largura, type: WidthType.DXA },
    borders: opts.semBorda ? semBordas : bordas,
    shading: opts.cinza ? { type: ShadingType.CLEAR, fill: opts.cinza, color: 'auto' } : undefined,
    margins: { left: 80, right: 80, top: 20, bottom: 20 },
    verticalAlign: VerticalAlign.TOP,
    children: conteudo,
  })
}

const rotulo = (r: string, valor?: string | null) => texto([{ t: r, b: true }, { t: valor ? ` ${valor}` : '' }])
const titulo = (r: string, extra = '') => texto([{ t: r, b: true }, { t: extra }])

function tabela(larguras: number[], linhas: Array<{ cells: TableCell[]; altura?: number }>): Table {
  return new Table({
    width: { size: LARGURA, type: WidthType.DXA },
    columnWidths: larguras,
    rows: linhas.map(l => new TableRow({ children: l.cells, height: l.altura ? { value: l.altura, rule: HeightRule.ATLEAST } : undefined })),
  })
}

const espaco = () => new Paragraph({ spacing: { after: 160 }, children: [] })

/** Ata no layout do modelo "01_Form Ata de Reunião". `logo`: parágrafo com a imagem (gerado no navegador). */
export function buildAtaDocx(d: AtaExportData, logo: Paragraph[] = []): Document {
  const W1 = 7654, W2 = LARGURA - W1
  const A1 = 4592, A2 = 1531, A3 = LARGURA - A1 - A2
  const presentes = ataPreencher(d.presentes, ATA_MIN_PRESENTES, { nome: '', setorEmpresa: null })
  const acoes = ataPreencher(d.acoes, ATA_MIN_ACOES, { acao: '', prazo: null, responsavel: null })
  const caixas = ataCopias(d.copiasPara)
  const C = LARGURA / 4

  const cabecalho = new Table({
    width: { size: LARGURA, type: WidthType.DXA },
    columnWidths: [2200, LARGURA - 2200],
    rows: [new TableRow({ children: [
      celula(logo.length ? logo : texto([{ t: 'Logo do Projeto' }], 20), 2200, { semBorda: true }),
      new TableCell({
        width: { size: LARGURA - 2200, type: WidthType.DXA }, borders: semBordas, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Ata de Reunião Nº ${ataNumero(d.numero)}`, bold: true, size: 28 })] })],
      }),
    ] })],
  })

  const quadro = tabela([W1, W2], [
    { cells: [celula(titulo(d.instituicao ?? ''), LARGURA, { span: 2, cinza: CINZA })] },
    { cells: [celula(rotulo('Nome do projeto:', d.nomeProjeto), LARGURA, { span: 2 })] },
    { cells: [celula(rotulo('Local:', d.local), W1), celula(rotulo('Data:', ataData(d.data)), W2)] },
    { cells: [celula(rotulo('Elaborado por:', ataPessoa(d.elaboradoPor, d.elaboradoPorFuncao)), LARGURA, { span: 2 })] },
    { cells: [celula(rotulo('Aprovado por:', ataPessoa(d.aprovadoPor, d.aprovadoPorFuncao)), LARGURA, { span: 2 })] },
    { cells: [celula(titulo('I. Relação dos presentes'), LARGURA, { span: 2, cinza: CINZA })] },
    { cells: [celula(titulo('Nome:'), W1), celula(titulo('Setor/Empresa:'), W2)] },
    ...presentes.map(p => ({ cells: [celula(texto([{ t: p.nome }]), W1), celula(texto([{ t: p.setorEmpresa ?? '' }]), W2)] })),
    { cells: [celula(titulo('II. Assuntos tratados'), LARGURA, { span: 2, cinza: CINZA })] },
    { cells: [celula(texto([{ t: d.assuntosTratados ?? '' }]), LARGURA, { span: 2 })], altura: 1300 },
    { cells: [celula(titulo('III. Decisões tomadas'), LARGURA, { span: 2, cinza: CINZA })] },
    { cells: [celula(texto([{ t: d.decisoesTomadas ?? '' }]), LARGURA, { span: 2 })], altura: 1300 },
  ])

  const tabelaAcoes = tabela([A1, A2, A3], [
    { cells: [celula(titulo('IV. Ações a serem empreendidas'), A1, { cinza: CINZA }), celula(titulo('Prazo'), A2, { cinza: CINZA }), celula(titulo('Responsável'), A3, { cinza: CINZA })] },
    ...acoes.map(a => ({ cells: [celula(texto([{ t: a.acao }]), A1), celula(texto([{ t: a.prazo ? ataData(a.prazo) : '' }]), A2), celula(texto([{ t: a.responsavel ?? '' }]), A3)] })),
  ])

  const anexos = tabela([LARGURA], [
    { cells: [celula([...titulo('Documentos anexos:'), ...texto([{ t: d.anexos.map(a => `${a.nome}${a.url ? ` — ${a.url}` : ''}`).join('\n') }])], LARGURA, { cinza: CINZA_CLARO })], altura: 600 },
  ])

  // Grade de 4 colunas: 1ª célula é o rótulo, depois as caixas (como no modelo).
  const celulasCopias = [
    titulo('Enviar cópias para:'),
    ...caixas.map(c => texto([{ t: `${c.marcado ? '☒' : '☐'} ${c.texto}` }])),
  ]
  const linhasCopias: TableRow[] = []
  for (let i = 0; i < celulasCopias.length; i += 4) {
    linhasCopias.push(new TableRow({ children: celulasCopias.slice(i, i + 4).map(conteudo => celula(conteudo, C, { semBorda: true })) }))
  }
  const copias = tabela([LARGURA], [{ cells: [new TableCell({
    width: { size: LARGURA, type: WidthType.DXA }, borders: bordas,
    shading: { type: ShadingType.CLEAR, fill: CINZA_CLARO, color: 'auto' },
    children: [new Table({ width: { size: LARGURA - 200, type: WidthType.DXA }, columnWidths: [C, C, C, C].map(w => w - 50), rows: linhasCopias }), new Paragraph({ children: [] })],
  })] }])

  const assinaturas = tabela([LARGURA], [
    { cells: [celula(titulo('Assinaturas', ' <principais envolvidos>'), LARGURA, { cinza: CINZA })] },
    { cells: [celula(texto([{ t: d.presentes.map(p => `\n_______________________________\n${p.nome}`).join('\n') }]), LARGURA, { cinza: CINZA_CLARO })], altura: 1600 },
    { cells: [celula([...titulo('Obs:'), ...texto([{ t: d.observacoes ?? '' }])], LARGURA)], altura: 900 },
  ])

  return new Document({
    creator: 'Operum',
    title: `Ata de Reunião Nº ${ataNumero(d.numero)}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 18 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 850, bottom: 850, left: 850 } } },
      footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: ATA_RODAPE, size: 14 })] })] }) },
      children: [cabecalho, espaco(), quadro, tabelaAcoes, espaco(), anexos, espaco(), copias, espaco(), assinaturas],
    }],
  })
}

export async function gerarAtaDocx(d: AtaExportData): Promise<Buffer> { return Packer.toBuffer(buildAtaDocx(d)) }
