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
          width: '210mm',
          minHeight: '297mm',
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
            {/* Linha 1 — categoria (fundo cinza) */}
            <tr>
              <td
                colSpan={4}
                className="font-semibold text-center bg-gray-200"
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                {header.categoria}
              </td>
            </tr>

            {/* Linha 2 — Nome do projeto */}
            <tr>
              <td
                colSpan={4}
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                <span className="font-bold">Nome do projeto:</span>{' '}
                {header.nomeProjeto}
              </td>
            </tr>

            {/* Linha 3 — Gerente */}
            <tr>
              <td
                colSpan={4}
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                <span className="font-bold">Gerente do projeto:</span>{' '}
                {header.gerenteProjeto}
              </td>
            </tr>

            {/* Linha 4 — Elaborado por */}
            <tr>
              <td
                colSpan={4}
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                <span className="font-bold">Elaborado por:</span>{' '}
                {header.elaboradoPor}
              </td>
            </tr>

            {/* Linha 5 — Aprovado por + Versão */}
            <tr>
              <td
                colSpan={3}
                style={{ border: '1px solid black', padding: '3px 6px', width: '75%' }}
              >
                <span className="font-bold">Aprovado por:</span>{' '}
                {header.aprovadoPor}
              </td>
              <td
                style={{ border: '1px solid black', padding: '3px 6px', width: '25%' }}
              >
                <span className="font-bold">Versão:</span>{' '}
                {header.versao}
              </td>
            </tr>

            {/* Linha 6 — Assinatura + Data de aprovação */}
            <tr>
              <td
                colSpan={3}
                style={{ border: '1px solid black', padding: '3px 6px', height: '14mm' }}
              >
                <span className="font-bold">Assinatura:</span>
              </td>
              <td
                style={{ border: '1px solid black', padding: '3px 6px' }}
              >
                <span className="font-bold">Data de aprovação:</span>{' '}
                {header.dataAprovacao}
              </td>
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
              {['Ref.', 'Nome', 'Empresa/Equipe', 'Cargo/Competência', 'E-mail', 'Telefone/Fax', 'Endereço', 'Observações'].map(
                col => (
                  <th
                    key={col}
                    className="font-bold text-center"
                    style={{
                      border: '1px solid black',
                      padding: '3px 4px',
                      fontSize: '8pt',
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
                      verticalAlign: 'top',
                      textAlign: i === 0 ? 'center' : 'left',
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
