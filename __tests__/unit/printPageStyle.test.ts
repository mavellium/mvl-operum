import { describe, it, expect } from 'vitest'
import { printPageStyle, PAGE_NUMBER_MARGIN_MM } from '@/lib/printPageStyle'

describe('printPageStyle', () => {
  it('numera as páginas no rodapé e reserva a faixa na margem inferior', () => {
    const css = printPageStyle()
    expect(css).toContain('counter(page)')
    expect(css).toContain('counter(pages)')
    expect(css).toContain(`margin: 0mm 0mm ${PAGE_NUMBER_MARGIN_MM}mm`)
    expect(css).toContain('size: A4;')
  })

  it('paisagem desconta a faixa da altura de 210mm', () => {
    const css = printPageStyle({ landscape: true })
    expect(css).toContain('A4 landscape')
    expect(css).toContain(`min-height: ${210 - PAGE_NUMBER_MARGIN_MM}mm`)
  })

  it('desconta margem superior e mantém laterais', () => {
    const css = printPageStyle({ marginMm: { top: 15, x: 20 } })
    expect(css).toContain(`margin: 15mm 20mm ${PAGE_NUMBER_MARGIN_MM}mm`)
    expect(css).toContain(`min-height: ${297 - 15 - PAGE_NUMBER_MARGIN_MM}mm`)
  })
})
