'use server'

import { verifySession } from '@/lib/dal'
import { getUserProfile, updateUserProfile, changePassword, updateAvatar } from '@/services/userService'

export async function getUserProfileAction() {
  try {
    const { userId } = await verifySession()
    const profile = await getUserProfile(userId)
    return { profile }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar perfil' }
  }
}

export type ProfileActionState = { message?: string; error?: string }

export async function updateProfileAction(prevState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  try {
    const { userId } = await verifySession()
    await updateUserProfile(userId, {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      cargo: (formData.get('cargo') as string) || undefined,
      departamento: (formData.get('departamento') as string) || undefined,
      valorHora: Number(formData.get('valorHora') ?? 0),
    })
    return { message: 'Perfil atualizado com sucesso' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar perfil' }
  }
}

export async function changePasswordAction(prevState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  try {
    const { userId } = await verifySession()
    await changePassword(userId, {
      senhaAtual: formData.get('senhaAtual') as string,
      novaSenha: formData.get('novaSenha') as string,
      confirmacao: formData.get('confirmacao') as string,
    })
    return { message: 'Senha alterada com sucesso' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao alterar senha' }
  }
}

export async function uploadAvatarAction(formData: FormData) {
  try {
    const { userId } = await verifySession()
    const file = formData.get('file') as File
    if (!file || file.size === 0) throw new Error('Arquivo inválido')

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const { writeFile, mkdir } = await import('fs/promises')
    const { join } = await import('path')
    const dir = join(process.cwd(), 'public', 'uploads', 'avatars', userId)
    await mkdir(dir, { recursive: true })
    const filename = `avatar.${ext}`
    await writeFile(join(dir, filename), buffer)

    const avatarUrl = `/uploads/avatars/${userId}/${filename}`
    await updateAvatar(userId, avatarUrl)
    return { avatarUrl }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao fazer upload' }
  }
}
