// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  authApi: {
    me: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('@/lib/minio', () => ({
  s3: { send: vi.fn() },
  BUCKET: 'test-bucket',
  publicUrl: vi.fn((key: string) => `http://minio/${key}`),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import { authApi } from '@/lib/api-client'
import {
  getUserProfileAction,
  updateProfileAction,
  changePasswordAction,
} from '@/app/actions/profile'

const mockVerify = verifySession as ReturnType<typeof vi.fn>

const mockProfile = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@x.com',
  role: 'member',
  avatarUrl: null,
  cargo: null,
  departamento: null,
  hourlyRate: 0,
  isActive: true,
  forcePasswordChange: false,
}

beforeEach(() => vi.clearAllMocks())

describe('getUserProfileAction', () => {
  it('returns profile for authenticated user', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(authApi.me).mockResolvedValue(mockProfile)
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
    vi.mocked(authApi.updateProfile).mockResolvedValue(undefined)
    const fd = new FormData()
    fd.set('name', 'Nova Ana')
    fd.set('email', 'ana@x.com')
    fd.set('hourlyRate', '50')
    const result = await updateProfileAction({}, fd)
    expect(result).not.toHaveProperty('error')
    expect(authApi.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nova Ana' }),
    )
  })

  it('returns error on invalid data', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(authApi.updateProfile).mockRejectedValue(new Error('Validation failed'))
    const fd = new FormData()
    fd.set('name', 'A')
    fd.set('email', 'ana@x.com')
    fd.set('hourlyRate', '0')
    const result = await updateProfileAction({}, fd)
    expect(result).toHaveProperty('error')
  })
})

describe('changePasswordAction', () => {
  it('calls changePassword service with correct params', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined)
    const fd = new FormData()
    fd.set('senhaAtual', 'OldPass1!')
    fd.set('novaSenha', 'NewPass1!')
    fd.set('confirmacao', 'NewPass1!')
    const result = await changePasswordAction({}, fd)
    expect(result).toHaveProperty('message')
    expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass1!',
    })
  })

  it('returns error on failure', async () => {
    mockVerify.mockResolvedValue({ userId: 'u1', role: 'member' })
    vi.mocked(authApi.changePassword).mockRejectedValue(new Error('Senha atual incorreta'))
    const fd = new FormData()
    fd.set('senhaAtual', 'wrong')
    fd.set('novaSenha', 'NewPass1!')
    fd.set('confirmacao', 'NewPass1!')
    const result = await changePasswordAction({}, fd)
    expect(result).toHaveProperty('error')
  })
})
