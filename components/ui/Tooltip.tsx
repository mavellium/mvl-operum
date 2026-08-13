'use client'

import { useId, useLayoutEffect, useRef, useState, type MouseEvent, type FocusEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom'
}

const MARGIN = 8

/**
 * Tooltip para botões só-ícone. Renderiza via portal em <body> com
 * position:fixed — não é recortado por containers com overflow (ex.: toolbar
 * com scroll horizontal) e fica acima de qualquer conteúdo (z-index alto).
 * Ajusta a posição para nunca sair da janela (vira para cima/baixo e
 * desloca horizontalmente quando o botão está perto da borda da tela).
 */
function Tip({
  id,
  label,
  baseX,
  baseY,
  side,
}: {
  id: string
  label: string
  baseX: number
  baseY: number
  side: 'top' | 'bottom'
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [style, setStyle] = useState<{ left: number; top: number }>({ left: baseX, top: baseY })

  // Mede o próprio tamanho e clampa para caber na janela (refs só no effect).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const left = Math.min(Math.max(baseX, MARGIN + w / 2), window.innerWidth - MARGIN - w / 2)

    let top: number
    if (side === 'bottom') {
      top = baseY
      if (top + h > window.innerHeight - MARGIN) top = baseY - h - 12 // vira para cima
    } else {
      top = baseY - h
      if (top < MARGIN) top = baseY + 12 // vira para baixo
    }
    setStyle({ left, top })
  }, [baseX, baseY, side])

  return (
    <span
      ref={ref}
      id={id}
      role="tooltip"
      style={{ left: style.left, top: style.top }}
      className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg -translate-x-1/2"
    >
      {label}
    </span>
  )
}

export default function Tooltip({ label, children, side = 'bottom' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const id = useId()

  const show = (e: MouseEvent<HTMLSpanElement> | FocusEvent<HTMLSpanElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({
      left: r.left + r.width / 2,
      top: side === 'bottom' ? r.bottom + 6 : r.top - 6,
    })
    setVisible(true)
  }
  const hide = () => setVisible(false)

  const tip = visible && pos
    ? createPortal(
        <Tip id={id} label={label} baseX={pos.left} baseY={pos.top} side={side} />,
        document.body,
      )
    : null

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      {tip}
    </span>
  )
}
