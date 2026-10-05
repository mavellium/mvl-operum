import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CardModal from '@/components/card/CardModal'
vi.mock('@/app/actions/time', () => ({ getTimeEntriesAction: vi.fn().mockResolvedValue({ entries: [] }), getCardTimeAction: vi.fn().mockResolvedValue({ seconds: 0 }), getActiveTimerAction: vi.fn().mockResolvedValue({ entry: null }) }))
describe('formulário confirmado', () => {
  it('mantém campos e arquivos no erro, bloqueia envio duplo e fecha somente no sucesso', async () => {
    let release!: (value: { error: string }) => void
    const submit = vi.fn().mockImplementationOnce(() => new Promise(resolve => { release = resolve })).mockResolvedValue({ success: true })
    const close = vi.fn()
    const { container } = render(<CardModal isOpen onClose={close} onSubmit={submit} />)
    const title = screen.getByPlaceholderText('Título da tarefa...')
    fireEvent.change(title, { target: { value: 'Tarefa preservada' } })
    const file = new File(['conteúdo'], 'spec.txt', { type: 'text/plain' })
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
    const create = screen.getByRole('button', { name: 'Criar card' })
    fireEvent.click(create); fireEvent.click(create)
    await act(async () => { await Promise.resolve() })
    expect(submit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
    await act(async () => { release({ error: '500: tente novamente' }) })
    expect(close).not.toHaveBeenCalled()
    expect(title).toHaveValue('Tarefa preservada')
    expect(screen.getByText('spec.txt')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('500')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Criar card' })) })
    expect(submit.mock.calls[1][0].files).toEqual([file])
    expect(close).toHaveBeenCalledTimes(1)
  })
})
