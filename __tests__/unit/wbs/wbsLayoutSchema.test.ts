import { describe, it, expect } from 'vitest'
import { WbsLayoutOrientationSchema } from '@/lib/validation/wbsSchemas'

describe('layout da EAP na validação (.wbs e versões antigas)', () => {
  it.each([
    ['HORIZONTAL_TOPO', 'HORIZONTAL'], ['HORIZONTAL_BASE', 'HORIZONTAL'],
    ['ABAIXO', 'DIREITA'], ['ABAIXO_L', 'DIREITA'],
    ['LADO_A_LADO', 'LADO_A_LADO'], ['ESQUERDA', 'ESQUERDA'],
  ])('%s → %s', (valor, esperado) => expect(WbsLayoutOrientationSchema.parse(valor)).toBe(esperado))

  it('valor desconhecido é recusado', () => {
    expect(WbsLayoutOrientationSchema.safeParse('RADIAL').success).toBe(false)
  })
})
