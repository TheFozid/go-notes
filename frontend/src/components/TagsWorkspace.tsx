import { useState, useEffect } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import NoteNode from './NoteNode';

interface TagNodeProps {
  tagName: string;
  noteCount: number;
}

function TagNode({ tagName, noteCount }: TagNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const getNotesByTag = useWorkspaceStore((state) => state.getNotesByTag);
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const notes = getNotesByTag(tagName);

  return (
    <div style={{ marginBottom: '2px' }}>
      {/* Tag header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          cursor: 'pointer',
          borderRadius: '6px',
          backgroundColor: isExpanded ? '#eff6ff' : 'transparent',
          transition: 'background-color 0.15s'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span style={{ 
          marginRight: '8px',
          userSelect: 'none',
          color: '#6b7280',
          fontSize: '12px',
          width: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {isExpanded ? 'expand_more' : 'chevron_right'}
          </span>
        </span>
        <span style={{ marginRight: '8px' }}>
          <span className="material-symbols-outlined" style={{ 
            fontSize: '18px',
            color: isExpanded ? '#2563eb' : '#9ca3af'
          }}>
            label
          </span>
        </span>
        <span style={{ 
          flex: 1,
          fontSize: '14px',
          color: isExpanded ? '#111827' : '#4b5563',
          fontWeight: isExpanded ? 500 : 400
        }}>
          {tagName}
        </span>
        <span style={{ 
          fontSize: '12px',
          color: '#9ca3af',
          backgroundColor: isExpanded ? '#dbeafe' : '#f3f4f6',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 500
        }}>
          {noteCount}
        </span>
      </div>

      {/* Notes with this tag */}
      {isExpanded && (
        <div style={{ marginLeft: '24px' }}>
          {notes.map((note) => {
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
          {notes.length === 0 && (
            <div style={{ 
              padding: '12px',
              color: '#9ca3af',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              No notes with this tag
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TagsWorkspace() {
  const [isExpanded, setIsExpanded] = useState(false);
  const getAllUserTags = useWorkspaceStore((state) => state.getAllUserTags);
  const notes = useWorkspaceStore((state) => state.notes);

  const [userTags, setUserTags] = useState<[string, number][]>([]);

  useEffect(() => {
    setUserTags(getAllUserTags());
  }, [notes, getAllUserTags]);

  return (
    <div style={{ 
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid #e5e7eb'
    }}>
      {/* #Tags Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          cursor: 'pointer',
          borderRadius: '6px',
          backgroundColor: isExpanded ? '#f3f4f6' : 'transparent',
          transition: 'background-color 0.15s'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span style={{ 
          marginRight: '8px',
          userSelect: 'none',
          color: '#6b7280',
          fontSize: '12px',
          width: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {isExpanded ? 'expand_more' : 'chevron_right'}
          </span>
        </span>
        <span style={{ marginRight: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#6b7280' }}>
            sell
          </span>
        </span>
        <span style={{ 
          flex: 1,
          fontWeight: 600,
          fontSize: '14px',
          color: '#111827'
        }}>
          Tags
        </span>
        <span style={{ 
          fontSize: '12px',
          color: '#9ca3af',
          backgroundColor: '#f3f4f6',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 500
        }}>
          {userTags.length}
        </span>
      </div>

      {/* Tag list */}
      {isExpanded && (
        <div style={{ marginLeft: '8px', marginTop: '4px' }}>
          {userTags.length === 0 ? (
            <div style={{ 
              padding: '12px',
              color: '#9ca3af',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              No tags yet
            </div>
          ) : (
            userTags.map(([tagName, count]) => (
              <TagNode key={tagName} tagName={tagName} noteCount={count} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
