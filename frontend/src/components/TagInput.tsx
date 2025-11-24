import { useState, useRef, useEffect } from 'react';

interface TagInputProps {
  currentTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagInput({ currentTags, onTagsChange }: TagInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleAddTag() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    const exists = currentTags.some(tag => tag.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setInputValue('');
      return;
    }

    onTagsChange([...currentTags, trimmed]);
    setInputValue('');
  }

  function handleRemoveTag(tagToRemove: string) {
    onTagsChange(currentTags.filter(tag => tag !== tagToRemove));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Main button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 14px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#374151',
          transition: 'all 0.15s',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.backgroundColor = '#f9fafb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.backgroundColor = '#ffffff';
        }}
        title="Manage tags"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6b7280' }}>
          label
        </span>
        <span>Tags</span>
        {currentTags.length > 0 && (
          <span style={{
            backgroundColor: '#dbeafe',
            color: '#2563eb',
            fontSize: '12px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '20px',
            textAlign: 'center'
          }}>
            {currentTags.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
            right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0,
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1001,
            minWidth: '280px',
            padding: '12px',
          }}
        >
          {/* Add tag input */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add tag..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.15s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
              autoFocus
            />
            <button
              onClick={handleAddTag}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'background-color 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              title="Add tag"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            </button>
          </div>

          {/* Current tags list */}
          <div
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              borderTop: currentTags.length > 0 ? '1px solid #e5e7eb' : 'none',
              paddingTop: currentTags.length > 0 ? '12px' : '0',
            }}
          >
            {currentTags.length === 0 ? (
              <div style={{ 
                padding: '16px',
                color: '#9ca3af',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                No tags yet
              </div>
            ) : (
              currentTags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                >
                  <span style={{ 
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#9ca3af' }}>
                      label
                    </span>
                    {tag}
                  </span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Remove tag"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      close
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
