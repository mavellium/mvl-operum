import { Packer } from 'docx'
import { heading, modelDocument, modelTable, paragraphs } from './documentModel'
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
  aprovadoPor: string | null
  assuntosTratados: string | null
  decisoesTomadas: string | null
  observacoes: string | null
  copiasPara: string[]
  presentes: Presente[]
  acoes: Acao[]
  anexos: Anexo[]
}

const fmtDate = (d: Date | null | undefined) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
export function buildAtaDocx(d: AtaExportData) {
  return modelDocument(`Ata de Reunião Nº ${String(d.numero).padStart(2,'0')}`, [
    heading(`Ata de Reunião Nº ${String(d.numero).padStart(2,'0')}`),
    modelTable([7654,2552],[[d.instituicao ?? 'Instituição / curso / termo / semestre não informados',''],[`Nome do projeto: ${d.nomeProjeto}`,''],[`Local: ${d.local ?? '—'}`,`Data: ${fmtDate(d.data)}`],[`Elaborado por: ${d.elaboradoPor ?? '—'}`,''],[`Aprovado por: ${d.aprovadoPor ?? '—'}`,'']], false, true),
    heading('I. Relação dos presentes'),modelTable([5103,5103],[['Nome','Setor/Empresa'],...d.presentes.map(p => [p.nome,p.setorEmpresa ?? '—'])],true),
    heading('II. Assuntos tratados'),...paragraphs(d.assuntosTratados ?? ''),heading('III. Decisões tomadas'),...paragraphs(d.decisoesTomadas ?? ''),
    heading('IV. Ações a serem empreendidas'),modelTable([6124,2041,2041],[['Ações a serem empreendidas','Prazo','Responsável'],...d.acoes.map(a => [a.acao,fmtDate(a.prazo),a.responsavel ?? '—'])],true),
    heading('Documentos anexos'),...d.anexos.flatMap(a => paragraphs(`${a.nome}${a.url ? ` — ${a.url}` : ''}`)),
    heading('Enviar cópias para'),...paragraphs(d.copiasPara.join('; ')),heading('Plano do Projeto'),heading('Assinaturas'),
    modelTable([5103,5103],[['Nome','Assinatura'],...d.presentes.map(p => [p.nome,'________________________'])],true),heading('Obs:'),...paragraphs(d.observacoes ?? '')
  ], '© 01_Form Ata de Reunião')
}
export async function gerarAtaDocx(d: AtaExportData): Promise<Buffer> { return Packer.toBuffer(buildAtaDocx(d)) }
