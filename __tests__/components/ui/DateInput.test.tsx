import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateInput from '@/components/ui/DateInput'

describe('DateInput', () => {
  it('exibe o valor canônico (aaaa-mm-dd) como dd/mm/aaaa', () => {
    render(<DateInput value="2026-05-01" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('01/05/2026')
  })

  it('exibe ISO datetime como dd/mm/aaaa', () => {
    render(<DateInput value="2026-05-01T00:00:00.000Z" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('01/05/2026')
  })

  it('ao digitar dd/mm/aaaa emite aaaa-mm-dd no onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="" onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), '10/03/2025')

    expect(onChange).toHaveBeenCalledWith('2025-03-10')
    expect(screen.getByRole('textbox')).toHaveValue('10/03/2025')
  })

  it('não emite onChange enquanto a data digitada está incompleta', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="" onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), '10/0')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('reverte digitação incompleta ao sair do campo', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '10/0')
    await user.tab()

    expect(input).toHaveValue('')
  })

  it('aceita o calendário nativo (showPicker indisponível não quebra)', async () => {
    render(<DateInput value="2026-05-01" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Abrir calendário' })).toBeInTheDocument()
  })

  it('reescreve o texto quando o valor muda externamente', () => {
    const { rerender } = render(<DateInput value="2026-05-01" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('01/05/2026')

    rerender(<DateInput value="2026-12-31" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('31/12/2026')
  })
})