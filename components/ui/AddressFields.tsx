'use client'

import { useRef, useState } from 'react'
import { lookupCep, formatCep } from '@/lib/viacep'
import { Loader2 } from 'lucide-react'

// ─────────────────────────────────────────────
// Tipos exportados para reutilização
// ─────────────────────────────────────────────

export type AddressValues = {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

export const emptyAddress: AddressValues = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface AddressFieldsProps {
  values: AddressValues
  onChange: (field: keyof AddressValues, value: string) => void
  disabled?: boolean
  /** Quando true, inclui atributos `name` nos inputs para submissão via FormData */
  withNames?: boolean
}

// ─────────────────────────────────────────────
// Estilos reutilizáveis (padrão do projeto)
// ─────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────

export default function AddressFields({ values, onChange, disabled = false, withNames = false }: AddressFieldsProps) {
  const [cepLoading, setCepLoading] = useState(false)
  const numeroRef = useRef<HTMLInputElement>(null)

  async function handleCepBlur() {
    const raw = values.cep.replace(/\D/g, '')
    if (raw.length !== 8) return

    setCepLoading(true)
    const result = await lookupCep(raw)
    setCepLoading(false)

    if (result) {
      onChange('logradouro', result.logradouro)
      onChange('bairro', result.bairro)
      onChange('cidade', result.cidade)
      onChange('estado', result.estado)
      // Move o foco para o campo Número após o preenchimento automático
      setTimeout(() => numeroRef.current?.focus(), 50)
    } else {
      // CEP não encontrado — limpa os campos que seriam auto-preenchidos
      // e deixa o usuário digitar manualmente
      onChange('logradouro', '')
      onChange('bairro', '')
      onChange('cidade', '')
      onChange('estado', '')
    }
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCep(e.target.value)
    onChange('cep', formatted)
  }

  const fieldsDisabled = disabled || cepLoading

  return (
    <div className="space-y-3">
      {/* CEP */}
      <div>
        <label className={labelCls}>CEP</label>
        <div className="relative">
          <input
            type="text"
            value={values.cep}
            onChange={handleCepChange}
            onBlur={handleCepBlur}
            disabled={disabled}
            placeholder="00000-000"
            maxLength={9}
            {...(withNames ? { name: 'cep' } : {})}
            className={`${inputCls} pr-8`}
          />
          {cepLoading && (
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Logradouro + Número */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Logradouro</label>
          <input
            type="text"
            value={values.logradouro}
            onChange={e => onChange('logradouro', e.target.value)}
            disabled={fieldsDisabled}
            placeholder="Rua, Avenida, Travessa..."
            {...(withNames ? { name: 'logradouro' } : {})}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Número</label>
          <input
            ref={numeroRef}
            type="text"
            value={values.numero}
            onChange={e => onChange('numero', e.target.value)}
            disabled={fieldsDisabled}
            placeholder="123"
            {...(withNames ? { name: 'numero' } : {})}
            className={inputCls}
          />
        </div>
      </div>

      {/* Complemento */}
      <div>
        <label className={labelCls}>Complemento</label>
        <input
          type="text"
          value={values.complemento}
          onChange={e => onChange('complemento', e.target.value)}
          disabled={fieldsDisabled}
          placeholder="Apto, Sala, Bloco..."
          {...(withNames ? { name: 'complemento' } : {})}
          className={inputCls}
        />
      </div>

      {/* Bairro + Cidade + Estado */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Bairro</label>
          <input
            type="text"
            value={values.bairro}
            onChange={e => onChange('bairro', e.target.value)}
            disabled={fieldsDisabled}
            placeholder="Bairro"
            {...(withNames ? { name: 'bairro' } : {})}
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Cidade</label>
          <input
            type="text"
            value={values.cidade}
            onChange={e => onChange('cidade', e.target.value)}
            disabled={fieldsDisabled}
            placeholder="Cidade"
            {...(withNames ? { name: 'cidade' } : {})}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>UF</label>
          <input
            type="text"
            value={values.estado}
            onChange={e => onChange('estado', e.target.value.toUpperCase().slice(0, 2))}
            disabled={fieldsDisabled}
            placeholder="SP"
            maxLength={2}
            {...(withNames ? { name: 'estado' } : {})}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )
}
