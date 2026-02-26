interface SAConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SAConfirmModal = ({
  title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler',
  variant = 'primary', isLoading = false, onConfirm, onCancel,
}: SAConfirmModalProps) => {
  const btnClass = variant === 'danger' ? 'sa-btn sa-btn-danger' : 'sa-btn sa-btn-primary';

  return (
    <div className="sa-modal-overlay" onClick={onCancel}>
      <div className="sa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <h2 className="sa-modal-title">{title}</h2>
        <p style={{ fontSize: '0.9rem', color: '#737373', marginBottom: '24px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="sa-btn sa-btn-secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button className={btnClass} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Traitement...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
