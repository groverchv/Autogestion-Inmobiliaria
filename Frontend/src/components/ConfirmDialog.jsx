import Modal from './Modal';
import './SimpleUI.css';

/**
 * Diálogo de confirmación en lenguaje simple.
 * Solo para acciones destructivas o de pago; el resto no pide confirmación.
 */
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, text, confirmLabel = 'Sí, continuar', cancelLabel = 'Volver', danger = false }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <p className="confirm-dialog__text">{text}</p>
    <div className="confirm-dialog__actions">
      <button type="button" className="confirm-dialog__btn confirm-dialog__btn--cancel" onClick={onClose}>
        {cancelLabel}
      </button>
      <button
        type="button"
        className={`confirm-dialog__btn ${danger ? 'confirm-dialog__btn--danger' : 'confirm-dialog__btn--confirm'}`}
        onClick={onConfirm}
        autoFocus
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;
