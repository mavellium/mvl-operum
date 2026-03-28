import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CardTimer from '@/components/card/CardTimer'

vi.mock('@/app/actions/time', () => ({
  startTimerAction: vi.fn(),
  pauseTimerAction: vi.fn(),
  getCardTimeAction: vi.fn(),
  getActiveTimerAction: vi.fn(),
}))

import { startTimerAction, pauseTimerAction, getCardTimeAction, getActiveTimerAction } from '@/app/actions/time'

const mockStart = startTimerAction as ReturnType<typeof vi.fn>
const mockPause = pauseTimerAction as ReturnType<typeof vi.fn>
const mockGetTime = getCardTimeAction as ReturnType<typeof vi.fn>
const mockGetActive = getActiveTimerAction as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTime.mockResolvedValue({ seconds: 0 })
  mockGetActive.mockResolvedValue({ entry: null })
})

describe('CardTimer', () => {
  it('renders iniciar button when no active timer', async () => {
    render(<CardTimer cardId="c1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: /iniciar timer/i })).toBeInTheDocument())
  })

  it('renders pausar button when timer is running', async () => {
    mockGetActive.mockResolvedValue({
      entry: { id: 't1', isRunning: true, startedAt: new Date().toISOString(), duration: 0 },
    })
    mockGetTime.mockResolvedValue({ seconds: 120 })
    render(<CardTimer cardId="c1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: /pausar timer/i })).toBeInTheDocument())
  })

  it('shows accumulated time', async () => {
    mockGetTime.mockResolvedValue({ seconds: 90 })
    render(<CardTimer cardId="c1" />)
    await waitFor(() => {
      expect(screen.getByLabelText('Tempo acumulado')).toHaveTextContent('01:30')
    })
  })

  it('calls startTimerAction when iniciar clicked', async () => {
    const user = userEvent.setup()
    mockStart.mockResolvedValue({ entry: { id: 't1', isRunning: true } })
    render(<CardTimer cardId="c1" />)
    await waitFor(() => screen.getByRole('button', { name: /iniciar/i }))
    await user.click(screen.getByRole('button', { name: /iniciar timer/i }))
    expect(mockStart).toHaveBeenCalledWith('c1')
  })

  it('calls pauseTimerAction when pausar clicked', async () => {
    const user = userEvent.setup()
    mockGetActive.mockResolvedValue({
      entry: { id: 't1', isRunning: true, startedAt: new Date().toISOString(), duration: 0 },
    })
    mockPause.mockResolvedValue({ entry: { id: 't1', isRunning: false } })
    mockGetTime.mockResolvedValue({ seconds: 60 })
    render(<CardTimer cardId="c1" />)
    await waitFor(() => screen.getByRole('button', { name: /pausar timer/i }))
    await user.click(screen.getByRole('button', { name: /pausar timer/i }))
    expect(mockPause).toHaveBeenCalledWith('c1')
  })
})
