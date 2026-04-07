'use server'

import { put } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
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
    revalidatePath('/perfil')
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

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const blob = await put(`avatars/${userId}/avatar.${ext}`, file, { access: 'public' })

    await updateAvatar(userId, blob.url)
    revalidatePath('/perfil')
    return { avatarUrl: blob.url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao fazer upload' }
  }
}
