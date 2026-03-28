// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/userService', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  changePassword: vi.fn(),
  updateAvatar: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { getUserProfile, updateUserProfile, changePassword } from '@/services/userService'
import {
  getUserProfileAction,
  updateProfileAction,
  changePasswordAction,
} from '@/app/actions/profile'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const mockGetProfile = getUserProfile as ReturnType<typeof vi.fn>
const mockUpdateProfile = updateUserProfile as ReturnType<typeof vi.fn>
const mockChangePassword = changePassword as ReturnType<typeof vi.fn>

const mockProfile = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@x.com',
  role: 'member',
  avatarUrl: null,
  cargo: null,
  departamento: null,
  valorHora: 0,
}

beforeEach(() => vi.clearAllMocks())

describe('getUserProfileAction', () => {
  it('returns profile for authenticated user', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockGetProfile.mockResolvedValue(mockProfile)
    const result = await getUserProfileAction()
    expect(result).toHaveProperty('profile')
    expect(result.profile?.name).toBe('Ana')
  })

  it('returns error if not authenticated', async () => {
    mockVerify.mockRejectedValue(new Error('Não autenticado'))
    const result = await getUserProfileAction()
    expect(result).toHaveProperty('error')
  })
})

describe('updateProfileAction', () => {
  it('updates profile and returns updated data', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockUpdateProfile.mockResolvedValue({ ...mockProfile, name: 'Nova Ana' })
    const fd = new FormData()
    fd.set('name', 'Nova Ana')
    fd.set('email', 'ana@x.com')
    fd.set('valorHora', '50')
    const result = await updateProfileAction({}, fd)
    expect(result).not.toHaveProperty('error')
    expect(mockUpdateProfile).toHaveBeenCalledWith('u1', expect.objectContaining({ name: 'Nova Ana' }))
  })

  it('returns error on invalid data', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockUpdateProfile.mockRejectedValue(new Error('Validation failed'))
    const fd = new FormData()
    fd.set('name', 'A')
    fd.set('email', 'ana@x.com')
    fd.set('valorHora', '0')
    const result = await updateProfileAction({}, fd)
    expect(result).toHaveProperty('error')
  })
})

describe('changePasswordAction', () => {
  it('calls changePassword service with correct params', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockChangePassword.mockResolvedValue(undefined)
    const fd = new FormData()
    fd.set('senhaAtual', 'OldPass1!')
    fd.set('novaSenha', 'NewPass1!')
    fd.set('confirmacao', 'NewPass1!')
    const result = await changePasswordAction({}, fd)
    expect(result).toHaveProperty('message')
    expect(mockChangePassword).toHaveBeenCalledWith('u1', {
      senhaAtual: 'OldPass1!',
      novaSenha: 'NewPass1!',
      confirmacao: 'NewPass1!',
    })
  })

  it('returns error on failure', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockChangePassword.mockRejectedValue(new Error('Senha atual incorreta'))
    const fd = new FormData()
    fd.set('senhaAtual', 'wrong')
    fd.set('novaSenha', 'NewPass1!')
    fd.set('confirmacao', 'NewPass1!')
    const result = await changePasswordAction({}, fd)
    expect(result).toHaveProperty('error')
  })
})
