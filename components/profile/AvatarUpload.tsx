'use client'

import { useRef, useState, useEffect } from 'react'
import UserAvatar from '@/components/user/UserAvatar'
import { uploadAvatarAction } from '@/app/actions/profile'

interface AvatarUploadProps {
  name: string
  avatarUrl?: string | null
  onChange?: (url: string) => void
  disabled?: boolean
}

export default function AvatarUpload({ name, avatarUrl: initialAvatarUrl, onChange, disabled }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sincroniza o estado interno quando o pai atualiza a prop após prefill assíncrono
  // (ex: modo edição onde a URL só chega depois de uma Server Action)
  useEffect(() => {
    setAvatarUrl(initialAvatarUrl)
  }, [initialAvatarUrl])

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setShowMenu(false)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)

    const result = await uploadAvatarAction(fd)
    if ('avatarUrl' in result && result.avatarUrl) {
      setAvatarUrl(result.avatarUrl)
      onChange?.(result.avatarUrl)
    } else if ('error' in result) {
      setError(result.error ?? 'Erro ao fazer upload')
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-center gap-4 relative">
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => !disabled && !uploading && setShowMenu(!showMenu)}
          className={`
            relative rounded-full transition-all duration-300 ring-offset-4
            ${showMenu ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-slate-200'}
            ${disabled || uploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
          `}
        >
          <UserAvatar name={name} avatarUrl={avatarUrl} size="xl" />
          
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full backdrop-blur-[1px]">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* Menu de Opções (Visualizar e Alterar) */}
        {showMenu && (
          <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            {/* Seta do Menu */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-slate-100 rotate-45" />
            
            <button
              type="button"
              onClick={() => {
                if (avatarUrl) window.open(avatarUrl, '_blank')
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Visualizar
            </button>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Alterar foto
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}