import 'dotenv/config'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import { createInterface } from 'readline'

async function readStdin(): Promise<string> {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, terminal: false })
    let data = ''
    rl.on('line', line => { data += line })
    rl.on('close', () => resolve(data.trim()))
  })
}

async function main() {
  const email = process.argv[2]
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: echo <password> | tsx scripts/reset-user.ts <email>')
  }

  const password = await readStdin()
  if (!password || password.length < 4) throw new Error('Password too short (min 4 chars)')

  const passwordHash = await bcrypt.hash(password, 12)
  const r = await prisma.user.updateMany({
    where: { email },
    data: { loginAttempts: 0, passwordHash },
  })
  console.log(`[AUDIT] caller=local-admin email=${email} rows=${r.count} action=reset-password-and-attempts ts=${new Date().toISOString()}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
