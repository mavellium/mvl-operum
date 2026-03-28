'use client'

import { useRef } from 'react'
import { Attachment } from '@/types/kanban'

const ALLOWED_MIME = 'image/png,image/jpeg,image/webp,application/pdf'

interface CardAttachmentsProps {
  attachments: Attachment[]
  onUpload: (file: File) => void
  onDelete: (attachmentId: string) => void
}

export default function CardAttachments({ attachments, onUpload, onDelete }: CardAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-gray-700">Anexos</div>

      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {attachments.map(att => (
            <li key={att.id} className="flex items-center justify-between gap-2 text-sm">
              <a
                href={att.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate flex-1"
              >
                {att.fileName}
              </a>
              <button
                aria-label="Excluir anexo"
                onClick={() => onDelete(att.id)}
                className="text-xs text-red-500 hover:text-red-700 shrink-0"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME}
        onChange={handleFileChange}
        className="text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
      />
    </div>
  )
}
