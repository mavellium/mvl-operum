/**
 * Estilo de impressão (react-to-print) comum aos documentos: A4 com numeração
 * "Página X de Y" no rodapé. A numeração usa a caixa de margem do @page, que só
 * existe com margem inferior > 0; por isso as folhas marcadas com
 * `data-print-sheet` perdem essa faixa da altura mínima na impressão e não
 * criam uma página extra.
 */
export const PAGE_NUMBER_MARGIN_MM = 8

interface PrintPageStyleOptions {
  landscape?: boolean
  /** Margens laterais/superior do papel, em mm. Padrão: 0 (a folha já tem o próprio padding). */
  marginMm?: { top: number; x: number }
}

export function printPageStyle({ landscape = false, marginMm = { top: 0, x: 0 } }: PrintPageStyleOptions = {}): string {
  const height = landscape ? 210 : 297
  const usable = height - marginMm.top - PAGE_NUMBER_MARGIN_MM
  return `
    @page {
      size: A4${landscape ? ' landscape' : ''};
      margin: ${marginMm.top}mm ${marginMm.x}mm ${PAGE_NUMBER_MARGIN_MM}mm;
      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font: 8pt Arial, Helvetica, sans-serif;
        color: #555;
      }
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      [data-print-sheet] { min-height: ${usable}mm !important; }
      [data-print-sheet-fixed] { height: ${usable}mm !important; }
    }
  `
}
