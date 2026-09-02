'use client'

export type MemberOption = {
  id: string
  name: string
  setor: string | null
  signatureUrl?: string | null
}

interface Props {
  members: MemberOption[]
  value?: string | null
  onChange?: (member: MemberOption | null) => void
  placeholder?: string
  className?: string
  name?: string
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function MemberSelect({
  members,
  value,
  onChange,
  placeholder = 'Selecionar membro',
  className,
  name,
}: Props) {
  const current = members.find(m => m.id === value)

  function handleChange(id: string) {
    const member = members.find(m => m.id === id) ?? null
    onChange?.(member)
  }

  return (
    <select
      name={name}
      value={current?.id ?? ''}
      onChange={e => handleChange(e.target.value)}
      className={className ?? inputCls}
    >
      <option value="">{placeholder}</option>
      {members.map(m => (
        <option key={m.id} value={m.id}>
          {m.name}
          {m.setor ? ` — ${m.setor}` : ''}
        </option>
      ))}
    </select>
  )
}
