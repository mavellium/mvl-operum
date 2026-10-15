// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { assertSvgSeguro } from './svg-safety'

const ok = (s: string) => () => assertSvgSeguro(Buffer.from(s))

// Ícone do menu Organizar enviado pelo usuário (organizar-padrao.svg).
const ICONE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 9v4M8 13h16M8 13v3M24 13v3"/>
  <rect x="10" y="4" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
</svg>`

// Os 6 ícones do menu Organizar enviados pelo usuário em 15/10.
const ICONES_ORGANIZAR: Array<[string, string]> = [
  ['organizar-direita.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 8v18.5M9 16.5h5M9 26.5h5"/>
  <rect x="3" y="3" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="14" y="14" width="14" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="14" y="24" width="14" height="5" rx="1.2" fill="#F3F4F6"/>
</svg>`],
  ['organizar-esquerda.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M23 8v18.5M23 16.5h-5M23 26.5h-5"/>
  <rect x="17" y="3" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="4" y="14" width="14" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="4" y="24" width="14" height="5" rx="1.2" fill="#F3F4F6"/>
</svg>`],
  ['organizar-padrao.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 9v4M8 13h16M8 13v3M24 13v3"/>
  <rect x="10" y="4" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="2" y="16" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="16" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
</svg>`],
  ['organizar-horizontal-base.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 25.5h6M15 6.5v19M15 6.5h3M15 16h3"/>
  <rect x="2" y="23" width="10" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="4" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="13.5" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="23" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
</svg>`],
  ['organizar-horizontal-padrao.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 16h3M15 8.5v15M15 8.5h3M15 23.5h3"/>
  <rect x="2" y="13.5" width="10" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="6" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="21" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
</svg>`],
  ['organizar-horizontal-topo.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 6.5h6M15 6.5v19M15 16h3M15 25.5h3"/>
  <rect x="2" y="4" width="10" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="4" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="13.5" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
  <rect x="18" y="23" width="12" height="5" rx="1.2" fill="#F3F4F6"/>
</svg>`],
]

describe('assertSvgSeguro', () => {
  it('aceita SVG simples (ícones do menu Organizar), com declaração XML', () => {
    expect(ok(ICONE)).not.toThrow()
    expect(ok(`<?xml version="1.0" encoding="UTF-8"?>\n${ICONE}`)).not.toThrow()
    expect(ok('<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/></svg>')).not.toThrow()
  })

  it.each(ICONES_ORGANIZAR)('aceita o ícone %s', (_, svg) => {
    expect(ok(svg)).not.toThrow()
  })

  it.each([
    ['script', '<svg><script>alert(1)</script></svg>'],
    ['handler', '<svg onload="alert(1)"><rect/></svg>'],
    ['handler em elemento', '<svg><rect x="1" onclick = "x()"/></svg>'],
    ['javascript em href', '<svg><a href="javascript:alert(1)"><rect/></a></svg>'],
    ['entidade escondendo javascript', '<svg><a href="&#106;avascript:alert(1)">x</a></svg>'],
    ['foreignObject', '<svg><foreignObject><div>oi</div></foreignObject></svg>'],
    ['iframe', '<svg><iframe src="https://x"/></svg>'],
    ['image externa', '<svg><image href="https://evil/x.png"/></svg>'],
    ['use externo', '<svg><use xlink:href="https://evil/s.svg#a"/></svg>'],
    ['animate trocando href', '<svg><animate attributeName="href" to="javascript:alert(1)"/></svg>'],
    ['DOCTYPE/XXE', '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>'],
    ['CSS externo', '<svg><style>@import url(https://evil/x.css);</style></svg>'],
    ['url() externo', '<svg><rect style="fill:url(https://evil/p)"/></svg>'],
  ])('recusa %s', (_, svg) => {
    expect(ok(svg)).toThrow(BadRequestException)
  })

  it('recusa arquivo que não é SVG', () => {
    expect(ok('<html><body>oi</body></html>')).toThrow('não é um SVG válido')
    expect(ok('\u0000<svg></svg>')).toThrow('não é um SVG válido')
  })
})
