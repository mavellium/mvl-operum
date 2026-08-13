'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: string     // Ex: 'max-w-md', 'max-w-4xl', 'max-w-5xl'
  className?: string    // Para sobrescrever cor de fundo, texto, etc.
  hideHeader?: boolean  // Se true, remove o cabeçalho padrão do modal
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = 'max-w-md',
  className = 'bg-white text-gray-900',
  hideHeader = false
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Previne erros de hidratação no Next.js ao usar createPortal
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  // Scroll-lock e foco inicial — só depende de isOpen para não disparar a cada render do pai
  useEffect(() => {
    if (!isOpen) return

    // Guarda o valor anterior em vez de assumir 'unset': com dois overlays
    // sobrepostos, fechar o de cima não deve destravar o body do que ainda está aberto.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = setTimeout(() => {
      // O React já focou no mount qualquer elemento com autoFocus (ex.: o botão
      // Cancelar do ConfirmDialog). Se o foco atual está dentro do diálogo, mantém.
      const active = document.activeElement
      if (active && dialogRef.current?.contains(active)) return

      // Prioriza campos de entrada; só cai em button/tabindex se não houver nenhum.
      const focusTarget =
        dialogRef.current?.querySelector<HTMLElement>('input, textarea, select') ??
        dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      focusTarget?.focus()
    }, 10)

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  // Listener de teclado separado — precisa de onClose atualizado mas não deve re-focar.
  // Inclui focus trap: Tab/Shift+Tab circulam dentro do modal em vez de vazar para a página.
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!active || !dialogRef.current.contains(active)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
        return
      }
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Overlay Escuro com Blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Container Principal do Modal */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full ${maxWidth} rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200 overflow-hidden ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho Padrão (Ocultável) */}
        {!hideHeader && title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 shrink-0">
            <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Fechar modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Área de Conteúdo */}
        <div className={`overflow-y-auto flex-1 ${hideHeader ? '' : 'px-6 py-4'}`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}