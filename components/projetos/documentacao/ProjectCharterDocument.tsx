'use client'

import { forwardRef } from 'react'
import type { MacroFase } from './MacroFaseTable'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CharterDocumentProps {
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
  if (!value) return 0
  const n = parseFloat(value.replace(/[^0-9,.]/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function formatCusto(value: string | null | undefined): string {
  const n = parseCusto(value)
  return n === 0 ? '–' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '–'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Shared inline styles ───────────────────────────────────────────────────────

const cell: React.CSSProperties = {
  border: '1px solid #475569',
  padding: '5px 8px',
  verticalAlign: 'top',
  fontSize: '9pt',
  lineHeight: 1.35,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '8.5pt',
  fontWeight: 'bold',
  color: '#1e293b',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  borderBottom: '1.5px solid #334155',
  paddingBottom: 3,
  marginBottom: 6,
  marginTop: 14,
}

const bodyText: React.CSSProperties = {
  fontSize: '9pt',
  lineHeight: 1.5,
  color: '#1e293b',
  whiteSpace: 'pre-wrap',
}

const emptyText: React.CSSProperties = {
  ...bodyText,
  color: '#94a3b8',
  fontStyle: 'italic',
}

// ── Component ─────────────────────────────────────────────────────────────────

const ProjectCharterDocument = forwardRef<HTMLDivElement, CharterDocumentProps>(
  function ProjectCharterDocument(props, ref) {
    const {
      nomeProjeto, logoUrl, gerenteProjeto, gerenteSignatureUrl, startDate,
      elaboradoPor, aprovadoPor, versao, dataAprovacao,
      justificativa, objetivos, metodologia, descricaoProduto,
      premissas, restricoes, limitesAutoridade,
      principaisEnvolvidos, membros, fases,
    } = props

    const total = fases.reduce((sum, f) => sum + parseCusto(f.custo), 0)

    const envolvidos = principaisEnvolvidos.split('\n').filter(Boolean)

    return (
      <div
        ref={ref}
        className="bg-white text-black"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 20mm 20mm',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '9pt',
          lineHeight: 1.35,
          boxSizing: 'border-box',
          color: '#0f172a',
        }}
      >
        {/* ── Header table ──────────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
          <tbody>
            <tr>
              {/* Logo cell spanning 4 rows */}
              <td
                rowSpan={4}
                style={{ ...cell, width: 72, textAlign: 'center', verticalAlign: 'middle', padding: 6 }}
              >
                {logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={logoUrl} alt="Logo" style={{ maxHeight: 56, maxWidth: 64, objectFit: 'contain' }} />
                  : <div style={{ width: 56, height: 56, background: '#e2e8f0', borderRadius: 3 }} />
                }
              </td>
              {/* Title */}
              <td
                colSpan={3}
                style={{
                  ...cell,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  background: '#f1f5f9',
                  letterSpacing: 0.5,
                }}
              >
                TERMO DE ABERTURA DE PROJETO
              </td>
            </tr>
            <tr>
              <td style={{ ...cell, width: '35%' }}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt', color: '#475569' }}>Nome do Projeto</span>
                <br />{nomeProjeto}
              </td>
              <td style={{ ...cell, width: '35%' }}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt', color: '#475569' }}>Gerente do Projeto</span>
                <br />{gerenteProjeto || '–'}
              </td>
              <td style={{ ...cell, width: '30%' }}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt', color: '#475569' }}>Elaborado por</span>
                <br />{elaboradoPor || '–'}
              </td>
            </tr>
            <tr>
              <td style={cell}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt', color: '#475569' }}>Aprovado por</span>
                <br />{aprovadoPor || '–'}
              </td>
              <td style={cell}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt', color: '#475569' }}>Data de Aprovação</span>
                <br />{dataAprovacao || '–'}
              </td>
              <td style={cell}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt', color: '#475569' }}>Versão</span>
                <br />{versao}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={cell}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt', color: '#475569' }}>Assinatura do Gerente</span>
                <br />
                {gerenteSignatureUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={gerenteSignatureUrl} alt="Assinatura" style={{ maxHeight: 36, maxWidth: 160, marginTop: 3, objectFit: 'contain' }} />
                  : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                }
              </td>
              <td style={cell}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt', color: '#475569' }}>Data de Emissão</span>
                <br />{formatDate(startDate)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 1. Justificativa ──────────────────────────────────────────────── */}
        <p style={sectionTitleStyle}>1. Justificativa do Projeto</p>
        <p style={justificativa ? bodyText : emptyText}>{justificativa || 'Não informado.'}</p>

        {/* ── 2. Objetivos ──────────────────────────────────────────────────── */}
        <p style={sectionTitleStyle}>2. Objetivo(s) do Projeto</p>
        <p style={objetivos ? bodyText : emptyText}>{objetivos || 'Não informado.'}</p>

        {/* ── 3. Metodologia ────────────────────────────────────────────────── */}
        <p style={sectionTitleStyle}>3. Metodologia do Projeto</p>
        <p style={metodologia ? bodyText : emptyText}>{metodologia || 'Não informado.'}</p>

        {/* ── 4. Descrição do Produto ───────────────────────────────────────── */}
        <p style={sectionTitleStyle}>4. Descrição do Produto do Projeto</p>
        <p style={descricaoProduto ? bodyText : emptyText}>{descricaoProduto || 'Não informado.'}</p>

        {/* ── 5. Premissas e Restrições ─────────────────────────────────────── */}
        <p style={sectionTitleStyle}>5. Premissas e Restrições</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...cell, width: '50%', background: '#f8fafc', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'left' }}>
                Premissas (Hipóteses)
              </th>
              <th style={{ ...cell, width: '50%', background: '#f8fafc', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'left' }}>
                Restrições (Imposições)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cell, verticalAlign: 'top' }}>
                <p style={premissas ? bodyText : emptyText}>{premissas || 'Não informado.'}</p>
              </td>
              <td style={{ ...cell, verticalAlign: 'top' }}>
                <p style={restricoes ? bodyText : emptyText}>{restricoes || 'Não informado.'}</p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 6. Macro Fases ────────────────────────────────────────────────── */}
        <p style={sectionTitleStyle}>6. Macro Fases, Prazos e Custos</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ ...cell, width: '45%', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'left' }}>Macro Fase</th>
              <th style={{ ...cell, width: '25%', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'left' }}>Data Limite</th>
              <th style={{ ...cell, width: '30%', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'right' }}>Custo</th>
            </tr>
          </thead>
          <tbody>
            {fases.length === 0
              ? (
                <tr>
                  <td colSpan={3} style={{ ...cell, color: '#94a3b8', fontStyle: 'italic' }}>
                    Nenhuma macro fase cadastrada.
                  </td>
                </tr>
              )
              : fases.map(f => (
                <tr key={f.id}>
                  <td style={cell}>{f.fase || '–'}</td>
                  <td style={cell}>{formatDate(f.dataLimite)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatCusto(f.custo)}</td>
                </tr>
              ))
            }
          </tbody>
          <tfoot>
            <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
              <td colSpan={2} style={{ ...cell, fontSize: '8.5pt' }}>Total</td>
              <td style={{ ...cell, textAlign: 'right', fontSize: '8.5pt' }}>
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── 7. Principais Envolvidos ──────────────────────────────────────── */}
        <p style={sectionTitleStyle}>7. Principais Envolvidos</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ ...cell, width: '60%', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'left' }}>Nome</th>
              <th style={{ ...cell, width: '40%', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'left' }}>Papel / Instituição</th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m, i) => (
              <tr key={i}>
                <td style={cell}>{m.name}</td>
                <td style={cell}>Integrante</td>
              </tr>
            ))}
            {envolvidos.map((line, i) => (
              <tr key={`m-${i}`}>
                <td colSpan={2} style={cell}>{line}</td>
              </tr>
            ))}
            {membros.length === 0 && envolvidos.length === 0 && (
              <tr>
                <td colSpan={2} style={{ ...cell, color: '#94a3b8', fontStyle: 'italic' }}>Não informado.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── 8. Limites de Autoridade ──────────────────────────────────────── */}
        <p style={sectionTitleStyle}>8. Limites de Autoridade do Gerente</p>
        <p style={limitesAutoridade ? bodyText : emptyText}>{limitesAutoridade || 'Não informado.'}</p>
      </div>
    )
  },
)

export default ProjectCharterDocument
