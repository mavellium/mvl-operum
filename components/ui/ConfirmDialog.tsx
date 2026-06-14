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
  /** Quando true, o botão Cancelar recebe foco automático (recomendado para ações destrutivas). */
  cancelAutoFocus?: boolean
  /** Label do botão de confirmação. Padrão: 'Excluir'. */
  confirmLabel?: string
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  cancelVariant = 'secondary',
  cancelAutoFocus = false,
  confirmLabel = 'Excluir',
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant={cancelVariant} autoFocus={cancelAutoFocus} onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
