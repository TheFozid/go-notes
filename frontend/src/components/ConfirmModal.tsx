interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
        padding: '16px'
      }}
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-main)',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon and Title */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: isDangerous ? 'var(--danger-light)' : 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <span 
              className="material-symbols-outlined" 
              style={{ 
                fontSize: '24px',
                color: isDangerous ? 'var(--danger-hover)' : 'var(--primary)'
              }}
            >
              {isDangerous ? 'warning' : 'help'}
            </span>
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-main)'
            }}>
              {title}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5'
            }}>
              {message}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          justifyContent: 'flex-end',
          marginTop: '24px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-main)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-main)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          >
            {cancelText}
          </button>

          <button
            onClick={() => {
              onConfirm();
              onCancel(); // Close modal after confirm
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: isDangerous ? 'var(--danger)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDangerous ? 'var(--danger-hover)' : 'var(--primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDangerous ? 'var(--danger)' : 'var(--primary)';
            }}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
