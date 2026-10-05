export function parseDocumentCost(value?: string | null): number {
  const raw = (value ?? '').replace(/[^0-9,.-]/g, '')
  const amount = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw)
  return Number.isFinite(amount) ? amount : 0
}
