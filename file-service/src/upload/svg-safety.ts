import { BadRequestException } from '@nestjs/common'

export const SVG_MIME = 'image/svg+xml'

/**
 * Conteúdo ativo que não pode estar num SVG anexado. SVG é XML que o navegador
 * executa: script, handlers `on*`, `javascript:`, HTML embutido, links e
 * recursos externos e DOCTYPE/ENTITY (XXE, entidades que escondem o resto).
 * A regra é recusar, não limpar: ícones e desenhos comuns não usam nada disso.
 */
const PROIBIDOS: Array<[RegExp, string]> = [
  [/<!doctype|<!entity/i, 'DOCTYPE ou ENTITY'],
  [/<\s*script\b/i, 'script'],
  [/<\s*foreignobject\b/i, 'foreignObject'],
  [/<\s*(iframe|embed|object|audio|video|a|image|use|animate|set|handler|listener)\b/i, 'elemento ativo ou com link'],
  [/\son[a-z]+\s*=/i, 'atributo de evento (on...)'],
  [/javascript\s*:|vbscript\s*:|data\s*:\s*(text\/html|application\/|image\/svg)/i, 'URL executável'],
  [/(?:xlink:)?href\s*=/i, 'link (href)'],
  [/@import|url\s*\(\s*['"]?\s*(?!#)/i, 'recurso externo em CSS'],
]

/** Decodifica entidades numéricas (`&#106;`, `&#x6a;`) para que não escondam palavras proibidas. */
function semEntidades(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16) || 32))
    .replace(/&#([0-9]+);?/g, (_, d: string) => String.fromCodePoint(Number(d) || 32))
}

/** Lança 400 se o arquivo não for um SVG simples, sem conteúdo ativo. */
export function assertSvgSeguro(buffer: Buffer): void {
  const bruto = buffer.toString('utf8')
  if (bruto.includes('\u0000') || !/<svg[\s>]/i.test(bruto)) {
    throw new BadRequestException('O arquivo .svg não é um SVG válido.')
  }
  const texto = semEntidades(bruto)
  for (const [re, motivo] of PROIBIDOS) {
    if (re.test(texto)) {
      throw new BadRequestException(`SVG recusado: contém ${motivo}. Envie um SVG simples, só com formas e texto, ou exporte como PNG.`)
    }
  }
}
