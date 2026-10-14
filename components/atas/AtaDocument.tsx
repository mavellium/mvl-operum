'use client'

import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import type { AtaExportData } from '@/lib/exports/ataDocx'

/** Layout do modelo "Ata de Reunião" do Prof. Fábio: quadro único com faixas cinza numeradas. */
const BORDA = '1px solid #000'
const CINZA = '#d9d9d9'
const celula: CSSProperties = { border: BORDA, padding: '1px 5px', verticalAlign: 'top' }
// Listas do modelo não têm linhas horizontais entre itens, só o quadro e a divisão de colunas.
const itemLista: CSSProperties = { borderLeft: BORDA, borderRight: BORDA, padding: '0 5px', verticalAlign: 'top' }
const faixa: CSSProperties = { ...celula, background: CINZA, fontWeight: 'bold' }

const date = (value: Date | null) => (value ? value.toLocaleDateString('pt-BR') : '')

function Quadro({ children, colunas }: { children: ReactNode; colunas?: string[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: -1 }}>
      {colunas && <colgroup>{colunas.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>}
      <tbody>{children}</tbody>
    </table>
  )
}

function Bloco({ titulo, texto }: { titulo: string; texto: string | null }) {
  return (
    <Quadro>
      <tr><td style={faixa}>{titulo}</td></tr>
      <tr><td style={{ ...celula, whiteSpace: 'pre-wrap', minHeight: 20 }}>{texto || ' '}</td></tr>
    </Quadro>
  )
}

export default forwardRef<HTMLDivElement, { data: AtaExportData }>(function AtaDocument({ data: d }, ref) {
  const numero = d.numero ? String(d.numero).padStart(2, '0') : 'a definir'
  const copias = d.copiasPara
  const anexos = d.anexos.map(a => `${a.nome}${a.url ? ` — ${a.url}` : ''}`)

  return (
    <div ref={ref} data-print-sheet style={{ width: '210mm', minHeight: '297mm', padding: '12mm 14mm 14mm', boxSizing: 'border-box', background: 'white', color: 'black', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9pt', lineHeight: 1.3 }}>
      {/* Cabeçalho: logo + título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 10 }}>
        <div style={{ width: 110, height: 62, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #4a6fa5', background: '#6f93c8' }}>
          <span style={{ color: '#fff', fontSize: '12pt', textAlign: 'center', lineHeight: 1.15 }}>Logo do<br />Projeto</span>
        </div>
        <h1 style={{ margin: 0, flex: 1, textAlign: 'center', fontSize: '13pt', fontWeight: 'bold' }}>Ata de Reunião Nº {numero}</h1>
      </div>

      {/* Identificação */}
      <Quadro>
        <tr><td colSpan={2} style={{ ...faixa, fontSize: '8.5pt' }}>{d.instituicao || 'Instituição / curso / termo / semestre'}</td></tr>
        <tr><td colSpan={2} style={celula}><strong>Nome do projeto:</strong> {d.nomeProjeto}</td></tr>
        <tr>
          <td style={{ ...celula, width: '70%' }}><strong>Local:</strong> {d.local || ''}</td>
          <td style={celula}><strong>Data:</strong> {date(d.data)}</td>
        </tr>
        <tr><td colSpan={2} style={celula}><strong>Elaborado por:</strong> {d.elaboradoPor || ''}</td></tr>
        <tr><td colSpan={2} style={celula}><strong>Aprovado por:</strong> {d.aprovadoPor || ''}</td></tr>
      </Quadro>

      {/* I. Presentes */}
      <Quadro colunas={['66%', '34%']}>
        <tr><td colSpan={2} style={faixa}>I. Relação dos presentes</td></tr>
        <tr><td style={{ ...celula, borderBottom: 'none', fontWeight: 'bold' }}>Nome:</td><td style={{ ...celula, borderBottom: 'none', fontWeight: 'bold' }}>Setor/Empresa:</td></tr>
        {d.presentes.map((p, i) => (
          <tr key={i}>
            <td style={{ ...itemLista, borderBottom: i === d.presentes.length - 1 ? BORDA : 'none' }}>{p.nome}</td>
            <td style={{ ...itemLista, borderBottom: i === d.presentes.length - 1 ? BORDA : 'none' }}>{p.setorEmpresa || ''}</td>
          </tr>
        ))}
      </Quadro>

      <Bloco titulo="II. Assuntos tratados" texto={d.assuntosTratados} />
      <Bloco titulo="III. Decisões tomadas" texto={d.decisoesTomadas} />

      {/* IV. Ações */}
      <Quadro colunas={['52%', '16%', '32%']}>
        <tr>
          <td style={faixa}>IV. Ações a serem empreendidas</td>
          <td style={{ ...celula, background: CINZA }}>Prazo</td>
          <td style={{ ...celula, background: CINZA }}>Responsável</td>
        </tr>
        {d.acoes.map((a, i) => (
          <tr key={i}>
            <td style={{ ...itemLista, borderBottom: i === d.acoes.length - 1 ? BORDA : 'none' }}>{a.acao}</td>
            <td style={{ ...itemLista, borderBottom: i === d.acoes.length - 1 ? BORDA : 'none' }}>{date(a.prazo)}</td>
            <td style={{ ...itemLista, borderBottom: i === d.acoes.length - 1 ? BORDA : 'none' }}>{a.responsavel || ''}</td>
          </tr>
        ))}
      </Quadro>

      {/* Documentos anexos */}
      <Quadro>
        <tr><td style={{ ...celula, background: CINZA, minHeight: 28, whiteSpace: 'pre-wrap' }}><strong>Documentos anexos:</strong>{anexos.length ? `\n${anexos.join('\n')}` : ''}</td></tr>
      </Quadro>

      {/* Cópias */}
      <div style={{ marginTop: 10 }}>
        <Quadro>
          <tr>
            <td style={{ ...celula, background: CINZA }}>
              <strong>Enviar cópias para:</strong>
              {copias.map((c, i) => <div key={i}>❍ {c}</div>)}
              <div>❍ Plano do Projeto</div>
            </td>
          </tr>
        </Quadro>
      </div>

      {/* Assinaturas e observações */}
      <div style={{ marginTop: 10 }}>
        <Quadro>
          <tr>
            <td style={{ ...celula, background: CINZA, height: '24mm' }}>
              <strong>Assinaturas</strong>
              {d.presentes.map((p, i) => <div key={i} style={{ marginTop: 6 }}>{p.nome} ______________________________</div>)}
            </td>
          </tr>
          <tr>
            <td style={{ ...celula, minHeight: '32mm', whiteSpace: 'pre-wrap' }}>
              <strong>Obs:</strong>{d.observacoes ? `\n${d.observacoes}` : ''}
            </td>
          </tr>
        </Quadro>
      </div>
      <p style={{ marginTop: 6, fontSize: '7pt', color: '#444' }}>© 01_Form Ata de Reunião</p>
    </div>
  )
})
