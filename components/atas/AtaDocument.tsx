'use client'

import { forwardRef } from 'react'
import type { AtaExportData } from '@/lib/exports/ataDocx'

const cell = { border: '1px solid black', padding: '5px 8px', verticalAlign: 'top' } as const
function Table({ rows, header = false }: { rows: string[][]; header?: boolean }) {
  return <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}><tbody>{rows.map((row,i) => <tr key={i}>{row.map((value,j) => <td key={j} style={{ ...cell, background: header && i === 0 ? '#ddd' : undefined, fontWeight: header && i === 0 ? 'bold' : undefined, whiteSpace: 'pre-wrap' }}>{value || '—'}</td>)}</tr>)}</tbody></table>
}
function Section({ title, text }: { title: string; text: string | null }) { return <><h2 style={{ fontSize: '10pt', marginTop: 14 }}>{title}</h2><p style={{ whiteSpace: 'pre-wrap' }}>{text || '—'}</p></> }
const date = (value: Date | null) => value ? value.toLocaleDateString('pt-BR') : '—'
export default forwardRef<HTMLDivElement, { data: AtaExportData }>(function AtaDocument({ data: d }, ref) {
  return <div ref={ref} style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box', background: 'white', color: 'black', fontFamily: 'Arial', fontSize: '9pt' }}>
    <h1 style={{ textAlign: 'center', fontSize: '13pt' }}>Ata de Reunião Nº {d.numero ? String(d.numero).padStart(2,'0') : 'a definir'}</h1>
    <Table rows={[[d.instituicao || 'Instituição / curso / termo / semestre'],[`Nome do projeto: ${d.nomeProjeto}`]]} />
    <Table rows={[[`Local: ${d.local || '—'}`,`Data: ${date(d.data)}`],[`Elaborado por: ${d.elaboradoPor || '—'}`,''],[`Aprovado por: ${d.aprovadoPor || '—'}`,'']]} />
    <h2 style={{ fontSize: '10pt' }}>I. Relação dos presentes</h2><Table header rows={[["Nome","Setor/Empresa"],...d.presentes.map(p=>[p.nome,p.setorEmpresa || ''])]} />
    <Section title="II. Assuntos tratados" text={d.assuntosTratados} /><Section title="III. Decisões tomadas" text={d.decisoesTomadas} />
    <h2 style={{ fontSize: '10pt' }}>IV. Ações a serem empreendidas</h2><Table header rows={[["Ações a serem empreendidas","Prazo","Responsável"],...d.acoes.map(a=>[a.acao,date(a.prazo),a.responsavel || ''])]} />
    <Section title="Documentos anexos" text={d.anexos.map(a=>`${a.nome}${a.url ? ` — ${a.url}` : ''}`).join('\n')} />
    <Section title="Enviar cópias para" text={d.copiasPara.join('; ')} /><h2 style={{ fontSize: '10pt' }}>Plano do Projeto</h2>
    <h2 style={{ fontSize: '10pt' }}>Assinaturas</h2><Table header rows={[["Nome","Assinatura"],...d.presentes.map(p=>[p.nome,'________________________'])]} />
    <Section title="Obs:" text={d.observacoes} /><p style={{ marginTop: 20, fontSize: '8pt' }}>© 01_Form Ata de Reunião</p>
  </div>
})
