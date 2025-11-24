import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        zIndex: 1000,
        minWidth: '180px',
        padding: '4px',
        overflow: 'hidden'
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            color: item.danger ? '#ef4444' : '#374151',
            backgroundColor: 'transparent',
            borderRadius: '6px',
            fontSize: '14px',
            transition: 'background-color 0.15s',
            fontWeight: 500
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = item.danger ? '#fee2e2' : '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
