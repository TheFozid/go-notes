import { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

const COLORS = [
  '#FFFFFF', '#FFF9C4', '#FFE0E0',
  '#D1E7FF', '#D4EDDA', '#FFE5CC',
  '#E8DAEF', '#D5F5E3', '#FADBD8'
];

const COLOR_NAMES: Record<string, string> = {
  '#FFFFFF': 'White',
  '#FFF9C4': 'Yellow',
  '#FFE0E0': 'Pink',
  '#D1E7FF': 'Blue',
  '#D4EDDA': 'Green',
  '#FFE5CC': 'Orange',
  '#E8DAEF': 'Purple',
  '#D5F5E3': 'Mint',
  '#FADBD8': 'Peach'
};

function ColorPicker({ currentColor, onColorChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={pickerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '36px',
          height: '36px',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: currentColor,
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title={`Note color: ${COLOR_NAMES[currentColor] || 'Custom'}`}
      >
        <span
          style={{
            position: 'absolute',
            bottom: '3px',
            right: '3px',
            fontSize: '12px'
          }}
        >
          🎨
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: pickerRef.current ? pickerRef.current.getBoundingClientRect().bottom + 8 : 0,
            right: pickerRef.current ? window.innerWidth - pickerRef.current.getBoundingClientRect().right : 0,
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1001,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            width: '144px'
          }}
        >
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                onColorChange(color);
                setIsOpen(false);
              }}
              style={{
                width: '36px',
                height: '36px',
                border: currentColor === color ? '3px solid #2563eb' : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: color,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
              title={COLOR_NAMES[color]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ColorPicker;
