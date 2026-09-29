import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArquivosClient from '@/components/arquivos/ArquivosClient'

const card = { id: 'c1', title: 'EAP', sprintId: 's1', sprintName: 'Sprint 1', projectId: 'p1' }
const base = { isCover: false, uploadedAt: '2026-09-28T12:00:00.000Z', card, uploadedBy: null }

const anexos = [
  { ...base, id: 'a1', fileName: 'eap.png', fileType: 'image/png', fileSize: 2048, fileSizeFormatted: '2.0 KB', filePath: 'https://minio.operum.adm.br/operum/uploads/c1/x.png' },
  { ...base, id: 'a2', fileName: 'Aula da EAP', fileType: 'text/uri-list', fileSize: 0, fileSizeFormatted: 'Link', filePath: 'https://youtu.be/dQw4w9WgXcQ' },
  { ...base, id: 'a3', fileName: 'Link estranho', fileType: 'text/uri-list', fileSize: 0, fileSizeFormatted: 'Link', filePath: 'javascript:alert(1)' },
]

describe('ArquivosClient — links', () => {
  it('link mostra o host, abre a URL e não oferece download', () => {
    render(<ArquivosClient initialAttachments={anexos} />)
    expect(screen.getByText('youtu.be')).toBeInTheDocument()
    const abrir = screen.getAllByRole('link', { name: 'Abrir' })
    expect(abrir).toHaveLength(1)
    expect(abrir[0]).toHaveAttribute('href', 'https://youtu.be/dQw4w9WgXcQ')
    expect(screen.getAllByRole('link', { name: 'Download' })).toHaveLength(1)
  })

  it('filtro "Links" mostra só os links', async () => {
    const user = userEvent.setup()
    render(<ArquivosClient initialAttachments={anexos} />)
    await user.selectOptions(screen.getByDisplayValue('Todos os tipos'), 'link')
    expect(screen.queryByText('eap.png')).not.toBeInTheDocument()
    expect(screen.getByText('Aula da EAP')).toBeInTheDocument()
    expect(screen.getByText('Link estranho')).toBeInTheDocument()
  })
})
