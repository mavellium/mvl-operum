require('dotenv/config')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Copy tenants with type cast
    const tr = await client.query(`
      INSERT INTO auth."Tenant" (id, name, subdomain, status, config, "deletedAt", "createdAt", "updatedAt")
      SELECT id, name, subdomain, status::text::auth."TenantStatus", config, "deletedAt", "createdAt", "updatedAt"
      FROM public."Tenant"
      ON CONFLICT (id) DO NOTHING
    `)
    console.log('Tenants copiados:', tr.rowCount)

    // Find shared columns between public.User and auth.User
    const pcols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='User'
      ORDER BY ordinal_position
    `)
    const acols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='auth' AND table_name='User'
      ORDER BY ordinal_position
    `)
    const publicCols = pcols.rows.map(r => r.column_name)
    const authCols = acols.rows.map(r => r.column_name)
    const shared = publicCols.filter(c => authCols.includes(c))
    console.log('Colunas em comum:', shared.join(', '))

    const colList = shared.map(c => `"${c}"`).join(', ')
    const ur = await client.query(`
      INSERT INTO auth."User" (${colList})
      SELECT ${colList} FROM public."User"
      ON CONFLICT (id) DO NOTHING
    `)
    console.log('Users copiados:', ur.rowCount)

    await client.query('COMMIT')
    console.log('Pronto!')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Erro:', e.message)
  } finally {
    client.release()
    pool.end()
  }
}

run()
