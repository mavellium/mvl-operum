'use client'

import { useRef, useState } from 'react'
import { uploadSignatureAction } from '@/app/actions/profile'

interface SignatureUploadProps {
  signatureUrl?: string | null
}

export default function SignatureUpload({ signatureUrl: initial }: SignatureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [signatureUrl, setSignatureUrl] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)

    const result = await uploadSignatureAction(fd)
    if ('signatureUrl' in result && result.signatureUrl) {
      setSignatureUrl(result.signatureUrl)
    } else if ('error' in result) {
      setError(result.error || 'Erro ao fazer upload')
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">
        Sua assinatura aparecerá no formulário de stakeholders do projeto. Aceita PNG, JPG ou PDF.
      </p>

      {signatureUrl && (
        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signatureUrl}
            alt="Assinatura atual"
            className="max-h-16 max-w-xs object-contain"
          />
        </div>
      )}

      <div className="flex gap-3 items-center">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Enviando…' : signatureUrl ? 'Alterar assinatura' : 'Enviar assinatura'}
        </button>
        {signatureUrl && (
          <a
            href={signatureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Visualizar
          </a>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}
