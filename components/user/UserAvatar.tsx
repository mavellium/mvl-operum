'use client'

import { useState } from 'react'

interface UserAvatarProps {
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  avatarUrl?: string | null
}

// UI: Função para gerar uma cor de fundo harmônica baseada no nome do usuário
function getHashColor(name: string = '?') {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function UserAvatar({ name, size = 'md', avatarUrl }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  // Definição de escalas mais abrangente
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  }

  const sizeClass = sizeMap[size] || sizeMap.md

  // UI: Renderiza imagem se existir e não houver erro de carregamento
  if (avatarUrl && !imgError) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 border border-slate-200/50 shadow-sm`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name ?? 'Avatar'}
          title={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  // Fallback: Avatar com iniciais e cor dinâmica
  return (
    <div
      title={name}
      role="img"
      aria-label={name}
      className={`
        ${sizeClass} 
        ${getHashColor(name)} 
        rounded-full flex items-center justify-center 
        text-white font-semibold shrink-0 
        shadow-sm border-2 border-white/10
        select-none
      `}
    >
      <span className="tracking-tighter">
        {getInitials(name)}
      </span>
    </div>
  )
}