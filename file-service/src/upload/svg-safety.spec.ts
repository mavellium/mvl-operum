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

describe('assertSvgSeguro', () => {
  it('aceita SVG simples (ícones do menu Organizar), com declaração XML', () => {
    expect(ok(ICONE)).not.toThrow()
    expect(ok(`<?xml version="1.0" encoding="UTF-8"?>\n${ICONE}`)).not.toThrow()
    expect(ok('<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/></svg>')).not.toThrow()
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
