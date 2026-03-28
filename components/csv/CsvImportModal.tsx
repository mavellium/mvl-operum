'use client'

import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface ImportResult {
  imported: number
  errors: { row: number; message: string }[]
}

interface CsvImportModalProps {
  boardId: string
  isOpen: boolean
  onClose: () => void
  onImported?: () => void
}

export function CsvImportModal({ boardId, isOpen, onClose, onImported }: CsvImportModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const form = new FormData()
      form.set('boardId', boardId)
      form.set('file', file)
      const res = await fetch('/api/csv', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao importar')
      } else {
        setResult(data)
        onImported?.()
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar CSV">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Importe tarefas a partir de um arquivo CSV. Campos suportados:{' '}
          <code className="rounded bg-gray-100 px-1 text-xs">
            title, description, responsible, status, sprint, tags, startDate, endDate, color
          </code>
        </p>

        <div>
          <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-1">
            Arquivo CSV
          </label>
          <input
            id="csv-file"
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            required
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-blue-100"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="rounded-lg bg-green-50 p-3 text-sm">
            <p className="font-medium text-green-800">
              {result.imported} tarefa{result.imported !== 1 ? 's' : ''} importada{result.imported !== 1 ? 's' : ''} com sucesso.
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-orange-700 font-medium">
                  {result.errors.length} linha{result.errors.length !== 1 ? 's' : ''} com erro:
                </p>
                <ul className="mt-1 list-disc list-inside text-orange-600 space-y-0.5">
                  {result.errors.map((e) => (
                    <li key={e.row}>
                      Linha {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
