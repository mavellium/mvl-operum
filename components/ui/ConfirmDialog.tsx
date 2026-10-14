import Modal from './Modal'
import Button from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  /** Variante do botão de cancelamento. Padrão: 'secondary'. */
  cancelVariant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  /** Quando true, o botão Cancelar recebe foco automático. Padrão: true (diálogos de confirmação). */
  cancelAutoFocus?: boolean
  /** Label do botão de confirmação. Padrão: 'Excluir'. */
  confirmLabel?: string
  /** Conteúdo extra abaixo da mensagem (ex.: campo de motivo). */
  children?: React.ReactNode
  /** Desabilita a confirmação (ex.: motivo obrigatório não preenchido). */
  confirmDisabled?: boolean
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  cancelVariant = 'secondary',
  cancelAutoFocus = true,
  confirmLabel = 'Excluir',
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  // Foco inicial no Cancelar: o próximo Tab no DOM chega ao botão de confirmação.
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-gray-600 mb-6">{message}</p>
      {children && <div className="mb-6">{children}</div>}
      <div className="flex justify-end gap-3">
        <Button variant={cancelVariant} autoFocus={cancelAutoFocus} onClick={onClose}>Cancelar</Button>
        <Button variant="danger" disabled={confirmDisabled} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
