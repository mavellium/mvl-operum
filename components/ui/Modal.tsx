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
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = 'unset'
      return
    }

    // Trava o scroll do body quando o modal está aberto
    document.body.style.overflow = 'hidden'

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    
    // Foca no primeiro elemento clicável para acessibilidade
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable) {
      setTimeout(() => focusable.focus(), 10)
    }

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = 'unset'
    }
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