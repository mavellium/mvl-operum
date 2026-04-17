/**
 * scripts/migrate-blobs.ts
 *
 * One-time migration: moves all files from Vercel Blob to MinIO.
 *
 * What it does:
 *   1. Queries the database for all Vercel Blob URLs in:
 *      - Attachment.filePath
 *      - User.avatarUrl
 *      - Project.logoUrl
 *      - Stakeholder.logoUrl
 *   2. Downloads each file from Vercel Blob (public URL).
 *   3. Uploads it to MinIO under the same logical path structure.
 *   4. Updates the database record with the new MinIO URL.
 *   5. Prints a summary report.
 *
 * Run ONCE after configuring MinIO and before removing BLOB_READ_WRITE_TOKEN:
 *   npx tsx scripts/migrate-blobs.ts
 *
 * Prerequisites:
 *   - .env must have MINIO_* variables set and MinIO running
 *   - .env must still have BLOB_READ_WRITE_TOKEN (for download access if needed)
 *   - Run a full database backup before executing this script
 */

import 'dotenv/config'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { PrismaClient } from '../lib/generated/prisma'

// Inline the MinIO client here to avoid importing Next.js-specific modules
import { S3Client } from '@aws-sdk/client-s3'

const prisma = new PrismaClient()

const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost'
const port     = parseInt(process.env.MINIO_PORT ?? '9000', 10)
const useSSL   = process.env.MINIO_USE_SSL === 'true'

const s3 = new S3Client({
  endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId:     process.env.MINIO_ACCESS_KEY ?? '',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? '',
  },
  forcePathStyle: true,
})

const BUCKET = process.env.MINIO_BUCKET ?? 'mvloperum-dev'
const MINIO_PUBLIC_URL = (process.env.MINIO_PUBLIC_URL ?? `http://localhost:9000`).replace(/\/$/, '')

function minioPublicUrl(key: string): string {
  return `${MINIO_PUBLIC_URL}/${BUCKET}/${key}`
}

function isVercelBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')
}

async function downloadFile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`)
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, contentType }
}

async function uploadToMinio(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
}

// ── Migration helpers ──────────────────────────────────────────────────────────

async function migrateAttachments(): Promise<{ migrated: number; failed: number }> {
  const attachments = await prisma.attachment.findMany({
    where: { deletedAt: null },
    select: { id: true, filePath: true, cardId: true, fileName: true, fileType: true },
  })

  const toMigrate = attachments.filter(a => isVercelBlobUrl(a.filePath))
  console.log(`  Attachments to migrate: ${toMigrate.length}`)

  let migrated = 0
  let failed = 0

  for (const attachment of toMigrate) {
    try {
      const { buffer, contentType } = await downloadFile(attachment.filePath)
      const ext = attachment.fileName.includes('.') ? attachment.fileName.split('.').pop()! : 'bin'
      const key = `uploads/${attachment.cardId}/${attachment.id}.${ext}`
      await uploadToMinio(key, buffer, contentType)
      await prisma.attachment.update({
        where: { id: attachment.id },
        data: { filePath: minioPublicUrl(key) },
      })
      migrated++
      process.stdout.write('.')
    } catch (err) {
      failed++
      console.error(`\n  ✗ Attachment ${attachment.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log()
  return { migrated, failed }
}

async function migrateUserAvatars(): Promise<{ migrated: number; failed: number }> {
  const users = await prisma.user.findMany({
    where: { avatarUrl: { not: null }, deletedAt: null },
    select: { id: true, avatarUrl: true },
  })

  const toMigrate = users.filter(u => isVercelBlobUrl(u.avatarUrl))
  console.log(`  User avatars to migrate: ${toMigrate.length}`)

  let migrated = 0
  let failed = 0

  for (const user of toMigrate) {
    try {
      const { buffer, contentType } = await downloadFile(user.avatarUrl!)
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
      const key = `avatars/${user.id}/avatar.${ext}`
      await uploadToMinio(key, buffer, contentType)
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: minioPublicUrl(key) },
      })
      migrated++
      process.stdout.write('.')
    } catch (err) {
      failed++
      console.error(`\n  ✗ User avatar ${user.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log()
  return { migrated, failed }
}

async function migrateProjectLogos(): Promise<{ migrated: number; failed: number }> {
  const projects = await prisma.project.findMany({
    where: { logoUrl: { not: null }, deletedAt: null },
    select: { id: true, logoUrl: true },
  })

  const toMigrate = projects.filter(p => isVercelBlobUrl(p.logoUrl))
  console.log(`  Project logos to migrate: ${toMigrate.length}`)

  let migrated = 0
  let failed = 0

  for (const project of toMigrate) {
    try {
      const { buffer, contentType } = await downloadFile(project.logoUrl!)
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
      const key = `logos/projects/${project.id}.${ext}`
      await uploadToMinio(key, buffer, contentType)
      await prisma.project.update({
        where: { id: project.id },
        data: { logoUrl: minioPublicUrl(key) },
      })
      migrated++
      process.stdout.write('.')
    } catch (err) {
      failed++
      console.error(`\n  ✗ Project logo ${project.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log()
  return { migrated, failed }
}

async function migrateStakeholderLogos(): Promise<{ migrated: number; failed: number }> {
  const stakeholders = await prisma.stakeholder.findMany({
    where: { logoUrl: { not: null } },
    select: { id: true, logoUrl: true },
  })

  const toMigrate = stakeholders.filter(s => isVercelBlobUrl(s.logoUrl))
  console.log(`  Stakeholder logos to migrate: ${toMigrate.length}`)

  let migrated = 0
  let failed = 0

  for (const stakeholder of toMigrate) {
    try {
      const { buffer, contentType } = await downloadFile(stakeholder.logoUrl!)
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
      const key = `logos/stakeholders/${stakeholder.id}.${ext}`
      await uploadToMinio(key, buffer, contentType)
      await prisma.stakeholder.update({
        where: { id: stakeholder.id },
        data: { logoUrl: minioPublicUrl(key) },
      })
      migrated++
      process.stdout.write('.')
    } catch (err) {
      failed++
      console.error(`\n  ✗ Stakeholder logo ${stakeholder.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log()
  return { migrated, failed }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  MVL Operum — Vercel Blob → MinIO Migration')
  console.log('='.repeat(60))
  console.log(`  Target MinIO: ${MINIO_PUBLIC_URL}`)
  console.log(`  Target bucket: ${BUCKET}`)
  console.log()
  console.log('IMPORTANT: Make sure you have a full database backup before proceeding.')
  console.log()

  console.log('[1/4] Migrating attachment files...')
  const attachmentResult = await migrateAttachments()

  console.log('[2/4] Migrating user avatars...')
  const avatarResult = await migrateUserAvatars()

  console.log('[3/4] Migrating project logos...')
  const projectResult = await migrateProjectLogos()

  console.log('[4/4] Migrating stakeholder logos...')
  const stakeholderResult = await migrateStakeholderLogos()

  const totalMigrated = attachmentResult.migrated + avatarResult.migrated + projectResult.migrated + stakeholderResult.migrated
  const totalFailed   = attachmentResult.failed   + avatarResult.failed   + projectResult.failed   + stakeholderResult.failed

  console.log()
  console.log('='.repeat(60))
  console.log('  Migration complete')
  console.log(`  Total migrated: ${totalMigrated}`)
  console.log(`  Total failed:   ${totalFailed}`)
  console.log('='.repeat(60))

  if (totalFailed > 0) {
    console.log()
    console.log('Some files failed to migrate. Re-run the script to retry.')
    process.exit(1)
  }

  console.log()
  console.log('All files migrated successfully.')
  console.log('You can now remove BLOB_READ_WRITE_TOKEN from your .env file.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
