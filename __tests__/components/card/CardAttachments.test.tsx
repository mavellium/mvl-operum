import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CardAttachments from '@/components/card/CardAttachments'

const attachments = [
  { id: 'a1', fileName: 'design.pdf', fileType: 'application/pdf', filePath: '/uploads/c1/abc.pdf', fileSize: 1024, uploadedAt: Date.now() },
  { id: 'a2', fileName: 'screenshot.png', fileType: 'image/png', filePath: '/uploads/c1/def.png', fileSize: 2048, uploadedAt: Date.now() },
]

describe('CardAttachments', () => {
  it('renders list of existing attachments with fileName', () => {
    render(<CardAttachments attachments={attachments} onUpload={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('design.pdf')).toBeInTheDocument()
    expect(screen.getByText('screenshot.png')).toBeInTheDocument()
  })

  it('download link href matches filePath', () => {
    render(<CardAttachments attachments={attachments} onUpload={vi.fn()} onDelete={vi.fn()} />)
    const link = screen.getByRole('link', { name: /design\.pdf/i })
    expect(link).toHaveAttribute('href', '/uploads/c1/abc.pdf')
  })

  it('"Delete" button calls onDelete with attachmentId', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<CardAttachments attachments={attachments} onUpload={vi.fn()} onDelete={onDelete} />)
    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i })
    await user.click(deleteButtons[0])
    expect(onDelete).toHaveBeenCalledWith('a1')
  })

  it('file input accept attribute is restricted to allowed MIME types', () => {
    render(<CardAttachments attachments={[]} onUpload={vi.fn()} onDelete={vi.fn()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toContain('image/png')
    expect(input.accept).toContain('application/pdf')
  })

  it('calls onUpload with the selected file', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn()
    render(<CardAttachments attachments={[]} onUpload={onUpload} onDelete={vi.fn()} />)
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    expect(onUpload).toHaveBeenCalledWith(file)
  })
})
