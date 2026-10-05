'use client'

import { forwardRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjetoHeader {
  categoria: string
  nomeProjeto: string
  gerenteProjeto: string
  elaboradoPor: string
  aprovadoPor: string
  versao: string
  dataCriacao: string
  dataAprovacao: string
  logoUrl?: string | null
  signatureUrl?: string | null
}

export interface Stakeholder {
  ref: string
  nome: string
  empresaEquipe: string
  cargoCompetencia: string
  email: string
  telefoneFax: string
  endereco: string
  observacoes?: string
}

interface Props {
  header: ProjetoHeader
  stakeholders: Stakeholder[]
}

// ─── Component ────────────────────────────────────────────────────────────────

const StakeholderDocument = forwardRef<HTMLDivElement, Props>(
  function StakeholderDocument({ header, stakeholders }, ref) {
    return (
      <div
        ref={ref}
        className="bg-white text-black font-sans"
        style={{
          width: '297mm',
          minHeight: '210mm',
          padding: '15mm 15mm 20mm',
          fontSize: '9pt',
          lineHeight: '1.3',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Cabeçalho ── */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="flex items-center justify-center shrink-0 overflow-hidden"
            style={{ width: '28mm', height: '28mm' }}
          >
            {header.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={header.logoUrl}
                alt="Logo do projeto"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-center text-[8pt] text-gray-500"
                style={{ border: '1.5px dashed #9ca3af' }}
              >
                Logo
              </div>
            )}
          </div>
          <div className="flex-1 text-center">
            <p
              className="font-bold uppercase tracking-wide"
              style={{ fontSize: '11pt' }}
            >
              FORMULÁRIO DE STAKEHOLDER – PARTES INTERESSADAS
            </p>
          </div>
        </div>

        {/* ── Tabela 1 — Informações do Projeto ── */}
        <table
          className="w-full mb-6"
          style={{
            borderCollapse: 'collapse',
            border: '1px solid black',
          }}
        >
          <tbody>
            <tr>
              <td
                colSpan={2}
                className="font-bold text-left bg-gray-200"
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                {header.categoria}
              </td>
            </tr>

            <tr>
              <td
                colSpan={2}
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                <span className="font-bold">Nome do projeto:</span>{' '}
                {header.nomeProjeto}
              </td>
            </tr>

            <tr>
              <td
                colSpan={2}
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                <span className="font-bold">Gerente do projeto:</span>{' '}
                {header.gerenteProjeto}
              </td>
            </tr>

            <tr>
              <td
                colSpan={2}
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                <span className="font-bold">Elaborado por:</span>{' '}
                {header.elaboradoPor}
              </td>
            </tr>

            <tr>
              <td style={{ border: '1px solid black', padding: '3px 6px', width: '75%' }}><strong>Aprovado por:</strong> {header.aprovadoPor}</td>
              <td style={{ border: '1px solid black', padding: '3px 6px', width: '25%' }}><strong>Assinatura:</strong>
                {header.signatureUrl && <img src={header.signatureUrl} alt="Assinatura" style={{ maxHeight: '12mm', maxWidth: '55mm', objectFit: 'contain' }} />}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '3px 6px' }}><strong>Versão:</strong> {header.versao}</td>
              <td style={{ border: '1px solid black', padding: '3px 6px' }}><strong>Data de aprovação:</strong> {header.dataAprovacao}</td>
            </tr>
          </tbody>
        </table>

        {/* ── Tabela 2 — Lista de Stakeholders ── */}
        <table
          className="w-full"
          style={{
            borderCollapse: 'collapse',
            border: '1px solid black',
          }}
        >
          <thead>
            <tr className="bg-gray-200">
              {['Ref.', 'Nome', 'Empresa/Equipe', 'Cargo/Competência', 'e-mail', 'Telefone/Celular', 'Endereço', 'Observação'].map(
                col => (
                  <th
                    key={col}
                    className="font-bold text-center"
                    style={{
                      border: '1px solid black',
                      padding: '3px 4px',
                      fontSize: '8pt',
                      fontStyle: col === 'e-mail' ? 'italic' : 'normal',
                    }}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {stakeholders.map(s => (
              <tr key={s.ref}>
                {[
                  s.ref,
                  s.nome,
                  s.empresaEquipe,
                  s.cargoCompetencia,
                  s.email,
                  s.telefoneFax,
                  s.endereco,
                  s.observacoes ?? '',
                ].map((val, i) => (
                  <td
                    key={i}
                    style={{
                      border: '1px solid black',
                      padding: '3px 4px',
                      fontSize: '8pt',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      whiteSpace: i === 7 ? 'pre-wrap' : 'normal',
                    }}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
)

export default StakeholderDocument