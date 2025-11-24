import { useState, useEffect, useRef } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import NoteNode from './NoteNode';

export default function SearchPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const notes = useWorkspaceStore((state) => state.notes);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const timeoutRef = useRef<number | null>(null);

  // Debounce search query
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = debouncedQuery.toLowerCase();
    
    const results = notes.filter((note) => {
      if (note.is_trashed) return false;
      
      if (note.title.toLowerCase().includes(query)) return true;
      
      if (note.tags?.some(tag => tag.name.toLowerCase().includes(query))) return true;
      
      return false;
    });

    setSearchResults(results);
  }, [debouncedQuery, notes]);

  return (
    <div style={{ 
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid #e5e7eb'
    }}>
      {/* Search Header */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px 8px 12px'
      }}>
        <span className="material-symbols-outlined" style={{ 
          fontSize: '20px',
          color: '#6b7280',
          marginRight: '8px'
        }}>
          search
        </span>
        <span style={{ 
          fontWeight: 600,
          fontSize: '14px',
          color: '#111827'
        }}>
          Search
        </span>
      </div>

      {/* Search Input */}
      <div style={{ padding: '0 12px 12px 12px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              backgroundColor: '#ffffff',
              transition: 'all 0.15s',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <span className="material-symbols-outlined" style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            color: '#9ca3af',
            pointerEvents: 'none'
          }}>
            search
          </span>
        </div>
      </div>

      {/* Search Results */}
      {debouncedQuery.trim() && (
        <div style={{ 
          marginLeft: '8px',
          marginRight: '8px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {searchResults.length === 0 ? (
            <div style={{ 
              padding: '16px',
              color: '#9ca3af',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              No results found
            </div>
          ) : (
            <>
              <div style={{ 
                padding: '8px 12px 4px 12px',
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((note) => {
                const workspace = workspaces.find(w => w.id === note.workspace_id);
                if (!workspace) return null;
                
                return (
                  <NoteNode
                    key={note.id}
                    note={note}
                    workspaceId={note.workspace_id}
                    onUpdate={() => {}}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
