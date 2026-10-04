import { describe, expect, it } from 'vitest'
import { isTransactionConflict } from './transaction-conflict'

describe('isTransactionConflict', () => {
  it.each([
    { code: 'P2034' },
    { name: 'DriverAdapterError', cause: { kind: 'TransactionWriteConflict' } },
    { name: 'DriverAdapterError', cause: { kind: 'postgres', code: '40001' } },
    { name: 'DriverAdapterError', cause: { kind: 'postgres', code: '40P01' } },
  ])('reconhece conflito estruturado %j', error => {
    expect(isTransactionConflict(error)).toBe(true)
  })
  it.each([
    null,
    { code: 'P2002' },
    { name: 'DriverAdapterError', cause: { kind: 'postgres', code: '23505' } },
    { message: 'TransactionWriteConflict', cause: { kind: 'TransactionWriteConflict' } },
  ])('não mascara outros erros %j', error => {
    expect(isTransactionConflict(error)).toBe(false)
  })
})
