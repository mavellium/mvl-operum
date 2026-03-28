'use client'

import { useRef, useState } from 'react'
import UserAvatar from '@/components/user/UserAvatar'
import { uploadAvatarAction } from '@/app/actions/profile'

interface AvatarUploadProps {
  name: string
  avatarUrl?: string | null
}

export default function AvatarUpload({ name, avatarUrl: initialAvatarUrl }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadAvatarAction(fd)
    if ('avatarUrl' in result && result.avatarUrl) {
      setAvatarUrl(result.avatarUrl)
    } else if ('error' in result) {
      setError(result.error as string)
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group"
        aria-label="Alterar foto de perfil"
        disabled={uploading}
      >
        <div className="w-20 h-20">
          <UserAvatar name={name} avatarUrl={avatarUrl} size="md" />
        </div>
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Selecionar foto"
      />
      {uploading && <p className="text-xs text-gray-500">Enviando...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">Clique para alterar a foto</p>
    </div>
  )
}
