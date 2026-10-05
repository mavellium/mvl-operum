'use client'

import { forwardRef } from 'react'
import type { MacroFase } from './MacroFaseTable'
import { formatDateBR } from '@/lib/date'
import { parseDocumentCost } from '@/lib/documentCost'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CharterDocumentProps {
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
  return n === 0 ? '–' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
      nomeProjeto, logoUrl, gerenteProjeto, gerenteSignatureUrl,
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
          padding: '12mm 15mm 15mm',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '9pt',
          lineHeight: 1.35,
          boxSizing: 'border-box',
          color: '#0f172a',
        }}
      >
        {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxWidth: 100, maxHeight: 75, objectFit: 'contain' }} />}
        <h1 style={{ textAlign: 'center', fontSize: '13pt', marginBottom: 12 }}>Termo de Abertura de Projeto - project charter</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr><td colSpan={2} style={{ ...cell, background: '#ddd' }}>{props.categoria || 'Instituição / curso / termo / semestre'}</td></tr>
          <tr><td colSpan={2} style={cell}>Nome do projeto: {nomeProjeto}</td></tr>
          <tr><td style={cell}>Elaborado por: {elaboradoPor || '—'}</td><td style={cell}>Versão: {versao}</td></tr>
          <tr><td colSpan={2} style={cell}>Aprovado por: {aprovadoPor || '—'}</td></tr>
          <tr><td style={cell}>Assinatura: {gerenteSignatureUrl && <img src={gerenteSignatureUrl} alt="Assinatura" style={{ maxWidth: 160, maxHeight: 36, objectFit: 'contain' }} />}</td><td style={cell}>Data de aprovação: {dataAprovacao || '—'}</td></tr>
        </tbody></table>

        {/* ── 1. Justificativa ──────────────────────────────────────────────── */}
        <p style={sectionTitleStyle}>1. Justificativa do Projeto</p>
        <p style={justificativa ? bodyText : emptyText}>{justificativa || 'Não informado.'}</p>

        {/* ── 2. Objetivos ──────────────────────────────────────────────────── */}
        <p style={sectionTitleStyle}>2. Objetivo(s) do Projeto</p>
        <p style={objetivos ? bodyText : emptyText}>{objetivos || 'Não informado.'}</p>

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
              : fases.map((f, i) => (
                <tr key={f.id}>
                  <td style={cell}>1.{i + 1} {f.fase || '–'}</td>
                  <td style={cell}>{formatDateBR(f.dataLimite)}</td>
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
        <p style={sectionTitleStyle}>Designação de gerente</p><p style={bodyText}>Gerente do projeto: {gerenteProjeto || '—'}</p><p style={sectionTitleStyle}>Limites de Autoridade do Gerente</p>
        <p style={limitesAutoridade ? bodyText : emptyText}>{limitesAutoridade || 'Não informado.'}</p>
        {metodologia && <><p style={sectionTitleStyle}>Metodologia do projeto</p><p style={bodyText}>{metodologia}</p></>}
        <p style={{ fontSize: '8pt', marginTop: 20 }}>© 02_Project Charter</p>
      </div>
    )
  },
)

export default ProjectCharterDocument
