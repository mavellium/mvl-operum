/** Prisma query/commit and PostgreSQL adapter report retryable conflicts differently. */
export function isTransactionConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ('code' in error && error.code === 'P2034') return true
  if (!('name' in error) || error.name !== 'DriverAdapterError' || !('cause' in error)) return false
  const cause = error.cause
  if (!cause || typeof cause !== 'object' || !('kind' in cause)) return false
  if (cause.kind === 'TransactionWriteConflict') return true
  return cause.kind === 'postgres' && 'code' in cause && (cause.code === '40001' || cause.code === '40P01')
}
