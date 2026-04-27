'use server'

import { PutObjectCommand } from '@aws-sdk/client-s3'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { authApi } from '@/lib/api-client'
import { s3, BUCKET, publicUrl } from '@/lib/minio'

export async function getUserProfileAction() {
  try {
    await verifySession()
    const profile = await authApi.me()
    return { profile }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar perfil' }
  }
}

export type ProfileActionState = { message?: string; error?: string }

export async function updateProfileAction(prevState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  try {
    await verifySession()
    await authApi.updateProfile({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      cargo: (formData.get('cargo') as string) || undefined,
      departamento: (formData.get('departamento') as string) || undefined,
      hourlyRate: Number(formData.get('hourlyRate') ?? 0),
      phone: (formData.get('phone') as string) || undefined,
      cep: (formData.get('cep') as string) || undefined,
      logradouro: (formData.get('logradouro') as string) || undefined,
      numero: (formData.get('numero') as string) || undefined,
      complemento: (formData.get('complemento') as string) || undefined,
      bairro: (formData.get('bairro') as string) || undefined,
      cidade: (formData.get('cidade') as string) || undefined,
      estado: (formData.get('estado') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    })
    const avatarUrl = formData.get('avatarUrl') as string | null
    if (avatarUrl) {
      await authApi.updateProfile({ avatarUrl })
    }
    revalidatePath('/perfil')
    return { message: 'Perfil atualizado com sucesso' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar perfil' }
  }
}

export async function changePasswordAction(prevState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  try {
    await verifySession()
    await authApi.changePassword({
      currentPassword: formData.get('senhaAtual') as string,
      newPassword: formData.get('novaSenha') as string,
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
    const key = `avatars/${userId}/avatar-${Date.now()}.${ext}`

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
      }),
    )

    return { avatarUrl: publicUrl(key) }
  } catch (err) {
    console.error('[uploadAvatarAction]', err)
    const code = (err as Record<string, unknown>)?.Code ?? (err as Record<string, unknown>)?.name
    const msg = err instanceof Error ? err.message : undefined
    return { error: msg || (code ? `Erro S3: ${code}` : 'Erro ao fazer upload') }
  }
}
