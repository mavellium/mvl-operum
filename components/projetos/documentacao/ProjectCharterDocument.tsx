'use client'

import { forwardRef } from 'react'
import type { MacroFase } from './MacroFaseTable'
import { formatDateBR } from '@/lib/date'
import { parseDocumentCost } from '@/lib/documentCost'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CharterDocumentProps {
  /** Linha cinza do topo (instituição / curso / termo / semestre). */
  categoria?: string
  nomeProjeto: string
  logoUrl?: string | null
  gerenteProjeto: string
  gerenteSignatureUrl?: string | null
  startDate?: string | null
  elaboradoPor: string
  aprovadoPor: string
  versao: string
  dataAprovacao: string
  justificativa: string
  objetivos: string
  metodologia: string
  descricaoProduto: string
  premissas: string
  restricoes: string
  limitesAutoridade: string
  principaisEnvolvidos: string
  membros: { name: string }[]
  fases: MacroFase[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseCusto(value: string | null | undefined): number {
  return parseDocumentCost(value)
}

function formatCusto(value: string | null | undefined): string {
  const n = parseCusto(value)
  return n === 0 ? '–' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** "Rótulo: valor" por linha → grupos (o mesmo rótulo repetido junta os valores). */
function agruparEnvolvidos(texto: string): { rotulo: string; valores: string[] }[] {
  const grupos: { rotulo: string; valores: string[] }[] = []
  for (const linha of texto.split('\n').map(l => l.trim()).filter(Boolean)) {
    const i = linha.indexOf(':')
    const rotulo = i > 0 ? linha.slice(0, i).trim() : ''
    const valor = i > 0 ? linha.slice(i + 1).trim() : linha
    const grupo = grupos.find(g => g.rotulo.toLowerCase() === rotulo.toLowerCase())
    if (grupo) grupo.valores.push(valor)
    else grupos.push({ rotulo, valores: [valor] })
  }
  return grupos
}

// ── Estilos (Termo de Abertura do professor: caixas simples, sem sublinhado) ──

const BORDA = '1px solid #000'
const FONTE = 'Arial, Helvetica, sans-serif'

const celula: React.CSSProperties = {
  border: BORDA,
  padding: '2px 5px',
  verticalAlign: 'top',
  fontSize: '9.5pt',
  lineHeight: 1.3,
}

const tabela: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' }

const titulo: React.CSSProperties = {
  fontSize: '9pt',
  fontWeight: 'bold',
  margin: '18px 0 4px 28px',
}

/** Caixa de texto corrido, justificado, com borda em volta (justificativa, objetivos, produto). */
const caixa: React.CSSProperties = {
  border: BORDA,
  padding: '2px 4px',
  fontSize: '10pt',
  lineHeight: 1.3,
  textAlign: 'justify',
  whiteSpace: 'pre-wrap',
  margin: 0,
}

const vazio: React.CSSProperties = { color: '#6b7280', fontStyle: 'italic' }

function Rotulo({ children }: { children: React.ReactNode }) {
  return <span style={{ fontWeight: 'bold' }}>{children}</span>
}

function Texto({ valor }: { valor: string }) {
  return <p style={caixa}>{valor || <span style={vazio}>Não informado.</span>}</p>
}

// ── Componente ─────────────────────────────────────────────────────────────────

const ProjectCharterDocument = forwardRef<HTMLDivElement, CharterDocumentProps>(
  function ProjectCharterDocument(props, ref) {
    const {
      categoria, nomeProjeto, logoUrl, gerenteProjeto, gerenteSignatureUrl,
      elaboradoPor, aprovadoPor, versao, dataAprovacao,
      justificativa, objetivos, metodologia, descricaoProduto,
      premissas, restricoes, limitesAutoridade,
      principaisEnvolvidos, membros, fases,
    } = props

    const total = fases.reduce((sum, f) => sum + parseCusto(f.custo), 0)

    const grupos = agruparEnvolvidos(principaisEnvolvidos)
    const instituicao = grupos.find(g => /^institui[cç][aã]o/i.test(g.rotulo))?.valores.join(' / ') ?? ''
    const integrantes = membros.map(m => m.name).filter(Boolean)
    // "Integrantes do Grupo" (a equipe do projeto) entra depois do professor, como no modelo.
    const idxProfessor = grupos.findIndex(g => /^professor/i.test(g.rotulo))
    const blocos: { rotulo: string; valores: string[] }[] = [...grupos]
    if (integrantes.length > 0) blocos.splice(idxProfessor + 1, 0, { rotulo: 'Integrantes do Grupo', valores: integrantes })

    return (
      <div
        ref={ref}
        className="bg-white text-black"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 18mm 20mm',
          fontFamily: FONTE,
          fontSize: '9.5pt',
          lineHeight: 1.3,
          boxSizing: 'border-box',
          color: '#000',
        }}
      >
        {/* ── Cabeçalho: logo + título ──────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 22 }}>
          <div style={{ width: 110, height: 62, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: logoUrl ? 'none' : '1px solid #4a6fa5', background: logoUrl ? 'transparent' : '#6f93c8' }}>
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="Logo" style={{ maxHeight: 62, maxWidth: 110, objectFit: 'contain' }} />
              : <span style={{ color: '#fff', fontSize: '12pt', textAlign: 'center', lineHeight: 1.15 }}>Logo do<br />Projeto</span>}
          </div>
          <h1 style={{ margin: 0, fontSize: '15pt', fontWeight: 'bold' }}>
            Termo de Abertura de Projeto - <em>project charter</em>
          </h1>
        </div>

        {/* ── Quadro de identificação ──────────────────────────────────────── */}
        <table style={tabela}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ ...celula, background: '#bfbfbf', fontWeight: 'bold', height: '1.6em' }}>{categoria || instituicao}</td>
            </tr>
            <tr>
              <td colSpan={2} style={celula}><Rotulo>Nome do projeto:</Rotulo> {nomeProjeto}</td>
            </tr>
            <tr>
              <td style={{ ...celula, width: '75%' }}><Rotulo>Elaborado por:</Rotulo> {elaboradoPor}</td>
              <td style={celula}><Rotulo>Versão:</Rotulo> {versao}</td>
            </tr>
            <tr>
              <td colSpan={2} style={celula}><Rotulo>Aprovado por:</Rotulo> {aprovadoPor}</td>
            </tr>
            <tr>
              <td style={celula}>
                <Rotulo>Assinatura:</Rotulo>
                {gerenteSignatureUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={gerenteSignatureUrl} alt="Assinatura" style={{ maxHeight: 34, maxWidth: 160, marginLeft: 6, verticalAlign: 'middle', objectFit: 'contain' }} />
                  : null}
              </td>
              <td style={celula}><Rotulo>Data de aprovação:</Rotulo> {dataAprovacao}</td>
            </tr>
          </tbody>
        </table>

        <p style={titulo}>Justificativa do projeto</p>
        <Texto valor={justificativa} />

        <p style={titulo}>Objetivo(s) do Projeto</p>
        <Texto valor={objetivos} />

        <p style={titulo}>Descrição do produto do projeto</p>
        <Texto valor={descricaoProduto} />

        <p style={titulo}>Premissas (hipóteses) e restrições para o projeto</p>
        <table style={tabela}>
          <thead>
            <tr>
              <th style={{ ...celula, width: '50%', textAlign: 'center', borderBottom: BORDA }}>Premissas (hipóteses)</th>
              <th style={{ ...celula, width: '50%', textAlign: 'center', borderBottom: BORDA }}>Restrições</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...celula, whiteSpace: 'pre-wrap' }}>{premissas || <span style={vazio}>Não informado.</span>}</td>
              <td style={{ ...celula, whiteSpace: 'pre-wrap' }}>{restricoes || <span style={vazio}>Não informado.</span>}</td>
            </tr>
          </tbody>
        </table>

        <p style={titulo}>Macro Fases, prazos e custo</p>
        <table style={tabela}>
          <thead>
            <tr>
              <th style={{ ...celula, width: '64%', fontWeight: 'normal', textAlign: 'center' }}>Macro fase</th>
              <th style={{ ...celula, width: '16%', fontWeight: 'normal', textAlign: 'center' }}>Data limite</th>
              <th style={{ ...celula, width: '20%', fontWeight: 'normal', textAlign: 'center' }}>Custo</th>
            </tr>
          </thead>
          <tbody>
            {fases.length === 0 ? (
              <tr><td colSpan={3} style={{ ...celula, ...vazio }}>Nenhuma macro fase cadastrada.</td></tr>
            ) : fases.map(f => (
              <tr key={f.id}>
                <td style={{ ...celula, borderTop: 'none', borderBottom: 'none' }}>{f.fase || '–'}</td>
                <td style={{ ...celula, borderTop: 'none', borderBottom: 'none', textAlign: 'center' }}>{formatDateBR(f.dataLimite)}</td>
                <td style={{ ...celula, borderTop: 'none', borderBottom: 'none', textAlign: 'right' }}>{formatCusto(f.custo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ ...celula, textAlign: 'right', fontWeight: 'bold' }}>Custo total</td>
              <td style={{ ...celula, textAlign: 'right' }}>
                {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        <p style={titulo}>Principais envolvidos</p>
        <div style={{ border: BORDA, padding: '14px 18px 10px', minHeight: 60, fontSize: '9.5pt', lineHeight: 1.35 }}>
          {blocos.length === 0 ? (
            <span style={vazio}>Não informado.</span>
          ) : blocos.map((g, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              {g.rotulo && <div style={{ fontWeight: 'bold' }}>{g.rotulo}</div>}
              {g.valores.map((v, j) => (
                <div key={j} style={{ marginLeft: g.rotulo ? '32mm' : 0 }}>{v}</div>
              ))}
            </div>
          ))}
        </div>

        <p style={titulo}>Designação de gerente</p>
        <table style={tabela}>
          <tbody>
            <tr>
              <td style={{ ...celula, width: '22%' }}>Gerente do projeto</td>
              <td style={celula}>{gerenteProjeto ? `A gerência do projeto será de responsabilidade de ${gerenteProjeto}.` : <span style={vazio}>Não informado.</span>}</td>
            </tr>
            <tr>
              <td style={celula}>Limites de autoridade</td>
              <td style={{ ...celula, whiteSpace: 'pre-wrap', minHeight: 60 }}>{limitesAutoridade || <span style={vazio}>Não informado.</span>}</td>
            </tr>
          </tbody>
        </table>

        {/* Metodologia não existe no modelo do professor; fica no fim, no mesmo estilo. */}
        {metodologia && (
          <>
            <p style={titulo}>Metodologia do projeto</p>
            <Texto valor={metodologia} />
          </>
        )}

        <p style={{ margin: '10px 0 0 28px', fontSize: '7.5pt' }}>© 02_Project Charter</p>
      </div>
    )
  },
)

export default ProjectCharterDocument
