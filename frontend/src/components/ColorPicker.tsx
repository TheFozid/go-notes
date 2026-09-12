import { useState, useRef, useEffect } from 'react';
import { NOTE_COLORS, DEFAULT_NOTE_COLOR } from '../utils/noteColors';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  isDark: boolean;
}

/*
 * Palettes come from utils/noteColors so a swatch matches what the editor
 * actually shows. This file used to keep its own dark list which had drifted
 * from that one: a different dark yellow, and green and mint duplicated.
 */
const LIGHT_COLORS = NOTE_COLORS.map((c) => c.value);
const DARK_COLORS = NOTE_COLORS.map((c) => c.dark);
const COLOR_NAMES: Record<string, string> = Object.fromEntries(
  NOTE_COLORS.map((c) => [c.value, c.name])
);

function ColorPicker({ currentColor, onColorChange, isDark }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Determine which palette to display
  const activePalette = isDark ? DARK_COLORS : LIGHT_COLORS;
  
  // Find the index of the current color in the canonical (light) palette
  const currentIndex = LIGHT_COLORS.findIndex(
    (c) => c.toUpperCase() === (currentColor || DEFAULT_NOTE_COLOR).toUpperCase()
  );
  
  // Determine the visual color to show on the main button
  const visualColor = (isDark && currentIndex !== -1) ? DARK_COLORS[currentIndex] : currentColor;

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
            border: '2px solid var(--border-main)',
            borderRadius: '8px',
            backgroundColor: visualColor,
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.15s',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-hover)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-main)';
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
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-main)',
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
          {activePalette.map((color, index) => {
            // When clicking, we always save the canonical (Light) color to the database
            // to ensure consistency and proper rendering by the getNoteColor utility.
            const canonicalColor = LIGHT_COLORS[index];
            
            return (
              <button
                key={canonicalColor}
                type="button"
                onClick={() => {
                  onColorChange(canonicalColor);
                  setIsOpen(false);
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  border: currentColor === canonicalColor ? '3px solid var(--primary)' : '2px solid var(--border-main)',
                  borderRadius: '8px',
                  backgroundColor: color,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                title={COLOR_NAMES[canonicalColor]}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ColorPicker;
