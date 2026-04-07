import prisma from '@/lib/prisma'
import { TagCreateSchema } from '@/lib/validation/tagSchemas'

export async function createTag(input: { name: string; color?: string; userId: string; tenantId: string }) {
  const parsed = TagCreateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  return prisma.tag.create({ data: { ...parsed.data, tenantId: input.tenantId } })
}

export async function deleteTag(tagId: string) {
  return prisma.tag.delete({ where: { id: tagId } })
}

export async function assignTagToCard(cardId: string, tagId: string) {
  return prisma.cardTag.create({ data: { cardId, tagId } })
}

export async function removeTagFromCard(cardId: string, tagId: string) {
  return prisma.cardTag.delete({
    where: { cardId_tagId: { cardId, tagId } },
  })
}

export async function getTagsForUser(userId: string) {
  return prisma.tag.findMany({ where: { userId } })
}
