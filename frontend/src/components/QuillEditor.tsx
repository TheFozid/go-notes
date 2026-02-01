import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import QuillCursors from 'quill-cursors';
import QuillTableBetter from 'quill-table-better';
import ImageResize from 'quill-image-resize';
import useWorkspaceStore from '../store/workspaceStore';
import useAuthStore from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getNote, updateNoteSearchText } from '../api/workspaces';
import { getNoteColor } from '../utils/noteColors';
import 'quill/dist/quill.snow.css';
import 'quill-table-better/dist/quill-table-better.css';
import 'katex/dist/katex.min.css';
import ColorPicker from './ColorPicker';
import { updateNote } from '../api/workspaces';
import TagInput from './TagInput';
import { setNoteTags } from '../api/workspaces';

Quill.register('modules/cursors', QuillCursors);
Quill.register({
  'modules/table-better': QuillTableBetter
}, true);
Quill.register('modules/imageResize', ImageResize);

function QuillEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const bindingRef = useRef<QuillBinding | null>(null);
  
  const selectedNoteId = useWorkspaceStore((state) => state.selectedNoteId);
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const { isDark } = useThemeStore();
  const [currentNoteColor, setCurrentNoteColor] = useState<string>('#FFFFFF');
  const [currentNoteTags, setCurrentNoteTags] = useState<string[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('[QuillEditor] Creating Quill instance');
    
    const toolbarElement = document.querySelector('#toolbar-container');
    if (toolbarElement) {
      toolbarElement.innerHTML = `
        <span class="ql-formats">
          <select class="ql-header">
            <option value="1"></option>
            <option value="2"></option>
            <option value="3"></option>
            <option selected></option>
          </select>
          <select class="ql-font"></select>
          <select class="ql-size">
            <option value="small"></option>
            <option selected></option>
            <option value="large"></option>
            <option value="huge"></option>
          </select>
        </span>
        <span class="ql-formats">
          <button class="ql-bold"></button>
          <button class="ql-italic"></button>
          <button class="ql-underline"></button>
          <button class="ql-strike"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-script" value="sub"></button>
          <button class="ql-script" value="super"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-color"></select>
          <select class="ql-background"></select>
        </span>
        <span class="ql-formats">
          <button class="ql-code"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-align"></select>
        </span>
        <span class="ql-formats">
          <button class="ql-indent" value="-1"></button>
          <button class="ql-indent" value="+1"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-list" value="ordered"></button>
          <button class="ql-list" value="bullet"></button>
          <button class="ql-list" value="check"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-blockquote"></button>
          <button class="ql-code-block"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-link"></button>
          <button class="ql-image"></button>
          <button class="ql-video"></button>
          <button class="ql-formula"></button>
          <button class="ql-table-better"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-clean"></button>
        </span>
      `;
    }
    
    quillRef.current = new Quill(containerRef.current, {
      theme: 'snow',
      modules: {
        toolbar: '#toolbar-container',
        cursors: true,
        history: {
          userOnly: true
        },
        table: false, // Disable default table module
        'table-better': {
          language: 'en_US',
          menus: ['column', 'row', 'merge', 'table', 'cell', 'wrap', 'delete'],
          toolbarTable: true
        },
        imageResize: {},
        keyboard: {
          bindings: QuillTableBetter.keyboardBindings
        }
      },
      placeholder: 'Start typing...'
    });

    console.log('[QuillEditor] Quill instance created');

    const toolbarContainer = document.querySelector('#toolbar-container');
    if (toolbarContainer) {
      toolbarContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const picker = target.closest('.ql-picker');
        
        if (picker) {
          setTimeout(() => {
            const pickerOptions = picker.querySelector('.ql-picker-options') as HTMLElement;
            if (pickerOptions && picker.classList.contains('ql-expanded')) {
              const pickerLabel = picker.querySelector('.ql-picker-label') as HTMLElement;
              if (pickerLabel) {
                const rect = pickerLabel.getBoundingClientRect();
                pickerOptions.style.position = 'fixed';
                pickerOptions.style.top = `${rect.bottom}px`;
                pickerOptions.style.left = `${rect.left}px`;
                pickerOptions.style.right = 'auto';
                pickerOptions.style.width = 'auto';
                pickerOptions.style.minWidth = `${rect.width}px`;
                pickerOptions.style.maxWidth = '300px';
              }
            }
          }, 10);
        }
      });
    }

    return () => {
      console.log('[QuillEditor] Unmounting - destroying Quill');
      quillRef.current = null;
    };
  }, []);

  useEffect(() => {
    console.log('[QuillEditor] Note change effect triggered');
    
    if (!quillRef.current) {
      console.log('[QuillEditor] No Quill instance yet');
      return;
    }
    
    if (selectedNoteId === null) {
      console.log('[QuillEditor] No note selected');
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      return;
    }
    
    if (selectedWorkspaceId === null) {
      console.log('[QuillEditor] No workspace selected');
      return;
    }
    
    if (!token) {
      console.log('[QuillEditor] No token available');
      return;
    }

    console.log('[QuillEditor] All conditions met, connecting to note:', selectedNoteId);
    
    if (bindingRef.current) {
      console.log('[QuillEditor] Destroying old binding before new connection');
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (providerRef.current) {
      console.log('[QuillEditor] Destroying old provider before new connection');
      providerRef.current.destroy();
      providerRef.current = null;
    }

    const noteId = selectedNoteId;
    const workspaceId = selectedWorkspaceId;
    
    let cancelled = false;

    async function connectToNote() {
      try {
        console.log('[QuillEditor] Fetching note metadata...');
        
        const noteData = await getNote(workspaceId, noteId);
        
        console.log('[QuillEditor] Note metadata received:', noteData);

        setCurrentNoteColor(noteData.color);
        setCurrentNoteTags(noteData.tags?.map(t => t.name) || []);

        if (cancelled) {
          console.log('[QuillEditor] Connection cancelled after fetch');
          return;
        }

        const ydoc = new Y.Doc();
        const ytext = ydoc.getText('quill');

        const baseTag = document.querySelector('base');
        const basePath = baseTag?.getAttribute('href')?.replace(/\/$/, '') || '';
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}${basePath}/yjs`;

        console.log('[QuillEditor] Connecting to Hocuspocus:', {
          wsUrl,
          room: noteData.yjs_room_id,
          hasToken: !!token
        });

        const provider = new HocuspocusProvider({
          url: wsUrl,
          name: noteData.yjs_room_id,
          document: ydoc,
          token: token || undefined,
          parameters: {
            token: token || ''
          },
        });

        if (cancelled) {
          console.log('[QuillEditor] Connection cancelled after provider creation');
          provider.destroy();
          return;
        }

        console.log('[QuillEditor] Waiting for sync...');

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            provider.off('synced', onSync);
            provider.off('status', onStatus);
            console.log('[QuillEditor] Sync timeout, proceeding anyway');
            resolve();
          }, 5000);
          
          const onSync = () => {
            clearTimeout(timeout);
            provider.off('synced', onSync);
            provider.off('status', onStatus);
            console.log('[QuillEditor] Synced via event');
            resolve();
          };
          
          const onStatus = ({ status }: { status: string }) => {
            console.log('[QuillEditor] Status:', status);
            if (status === 'synced') {
              clearTimeout(timeout);
              provider.off('synced', onSync);
              provider.off('status', onStatus);
              console.log('[QuillEditor] Synced via status');
              resolve();
            }
          };
          
          provider.on('synced', onSync);
          provider.on('status', onStatus);
          
          if (provider.isSynced) {
            clearTimeout(timeout);
            provider.off('synced', onSync);
            provider.off('status', onStatus);
            console.log('[QuillEditor] Already synced on check');
            resolve();
          }
        });

        if (cancelled) {
          console.log('[QuillEditor] Connection cancelled after sync');
          provider.destroy();
          return;
        }

        console.log('[QuillEditor] Creating binding');

        if (user) {
          provider.setAwarenessField('user', {
            id: user.id,
            name: user.username,
            color: getRandomColor()
          });
        }

        const binding = new QuillBinding(ytext, quillRef.current!, provider.awareness ?? undefined);
        
        console.log('[QuillEditor] Binding created');

        if (containerRef.current) {
          const editorDiv = containerRef.current.querySelector('.ql-editor') as HTMLElement;
          if (editorDiv) {
            const bgColor = getNoteColor(noteData.color, isDark);
            editorDiv.style.backgroundColor = bgColor;
            console.log('[QuillEditor] Applied color:', bgColor);
          }
        }

        if (!cancelled) {
          providerRef.current = provider;
          bindingRef.current = binding;
          console.log('[QuillEditor] Connection complete');
        } else {
          console.log('[QuillEditor] Connection cancelled, cleaning up');
          binding.destroy();
          provider.destroy();
        }

      } catch (error) {
        if (!cancelled) {
          console.error('[QuillEditor] Failed to connect to note:', error);
        }
      }
    }

    connectToNote();

    return () => {
      cancelled = true;
      console.log('[QuillEditor] Effect cleanup - cancelling async operation');
    };
  }, [selectedNoteId, selectedWorkspaceId, token, user]);

  // Update editor background when theme changes
  useEffect(() => {
    if (containerRef.current && selectedNoteId) {
      const editorDiv = containerRef.current.querySelector('.ql-editor') as HTMLElement;
      if (editorDiv) {
        const bgColor = getNoteColor(currentNoteColor, isDark);
        editorDiv.style.backgroundColor = bgColor;
        console.log('[QuillEditor] Updated background for theme:', isDark ? 'dark' : 'light', bgColor);
      }
    }
  }, [isDark, currentNoteColor, selectedNoteId]);

  // Extract and sync searchable text content
  useEffect(() => {
    if (!quillRef.current || !selectedNoteId || !selectedWorkspaceId) return;

    const quill = quillRef.current;
    let timeoutId: number | undefined;

    const updateSearchableContent = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(async () => {
        const text = quill.getText().trim();
        
        try {
          await updateNoteSearchText(selectedWorkspaceId, selectedNoteId, text);
          console.log('[QuillEditor] Updated searchable text');
        } catch (error) {
          console.error('[QuillEditor] Failed to update searchable text:', error);
        }
      }, 2000);
    };

    quill.on('text-change', updateSearchableContent);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      quill.off('text-change', updateSearchableContent);
    };
  }, [selectedNoteId, selectedWorkspaceId]);

  function getRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  async function handleColorChange(newColor: string) {
    if (!selectedNoteId || !selectedWorkspaceId) return;
    
    try {
      console.log('[QuillEditor] Changing note color to:', newColor);
      
      await updateNote(selectedWorkspaceId, selectedNoteId, { color: newColor });
      setCurrentNoteColor(newColor);

      useWorkspaceStore.getState().updateNote(selectedNoteId, { color: newColor });
      
      if (containerRef.current) {
        const editorDiv = containerRef.current.querySelector('.ql-editor') as HTMLElement;
        if (editorDiv) {
          const bgColor = getNoteColor(newColor, isDark);
          editorDiv.style.backgroundColor = bgColor;
        }
      }
      
      console.log('[QuillEditor] Color updated successfully');
    } catch (error) {
      console.error('[QuillEditor] Failed to update color:', error);
    }
  }

  async function handleTagsChange(newTags: string[]) {
    if (!selectedNoteId || !selectedWorkspaceId) return;
    
    try {
      console.log('[QuillEditor] Updating note tags to:', newTags);
      
      await setNoteTags(selectedWorkspaceId, selectedNoteId, newTags);
      setCurrentNoteTags(newTags);
      
      const noteData = await getNote(selectedWorkspaceId, selectedNoteId);
      useWorkspaceStore.getState().updateNote(selectedNoteId, { tags: noteData.tags });
      
      console.log('[QuillEditor] Tags updated successfully');
    } catch (error) {
      console.error('[QuillEditor] Failed to update tags:', error);
    }
  }

  function handleUndo() {
    if (quillRef.current) {
      quillRef.current.history.undo();
    }
  }

  function handleRedo() {
    if (quillRef.current) {
      quillRef.current.history.redo();
    }
  }

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--bg-main)'
    }}>
      {/* Toolbar Container */}
      <div style={{
        display: selectedNoteId ? 'flex' : 'none',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)',
        flexShrink: 0,
        borderBottom: `1px solid var(--border-main)`
      }}>
        
        {/* Line 1: Quill Editor Items */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f3f4f6', // Light separator between rows
        }}>
          <div style={{
            overflowX: 'auto',
            overflowY: 'visible',
            paddingBottom: '8px',
            marginBottom: '-8px'
          }}>
            <div 
              id="toolbar-container"
              style={{
                display: 'inline-flex'
              }}
            />
          </div>
        </div>

        {/* Line 2: Undo/Redo, Tags, Color */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-main)', // Main border at bottom
          gap: '16px',
          backgroundColor: 'var(--bg-main)',
          position: 'relative',
          zIndex: 10
        }}>
          
          {/* Undo / Redo Group */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleUndo}
              title="Undo"
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '4px',
                color: '#4b5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>undo</span>
            </button>
            <button
              onClick={handleRedo}
              title="Redo"
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '4px',
                color: '#4b5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>redo</span>
            </button>
          </div>

          {/* Separator */}
          <div style={{
            width: '1px',
            height: '24px',
            backgroundColor: '#e5e7eb',
            flexShrink: 0
          }} />

          {/* Tags and Color Picker */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flex: 1,
            position: 'relative',
            zIndex: 9999 // Ensures dropdowns appear above other elements
          }}>
            <TagInput
              currentTags={currentNoteTags}
              onTagsChange={handleTagsChange}
            />
            <ColorPicker 
              currentColor={currentNoteColor} 
              onColorChange={handleColorChange}
            />
          </div>
        </div>
      </div>
      
      {!selectedNoteId && (
        <div style={{ 
          padding: '48px 32px',
          textAlign: 'center',
          color: '#9ca3af',
          position: 'absolute',
          width: '100%',
          zIndex: 10
        }}>
          <span className="material-symbols-outlined" style={{ 
            fontSize: '64px',
            color: '#d1d5db',
            marginBottom: '16px',
            display: 'block'
          }}>
            description
          </span>
          <div style={{ 
            fontSize: '16px',
            fontWeight: 500,
            color: '#6b7280'
          }}>
            Select a note to start editing
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        style={{ 
          flex: 1,
          overflow: 'auto',
          visibility: selectedNoteId ? 'visible' : 'hidden',
          position: 'relative',
          zIndex: 1
        }}
      />
      
{/* Inject styles to fix checklist sizing and remove duplicates */}
      <style>{`
        /* 1. Reset the LI element */
        .ql-editor li[data-list="checked"],
        .ql-editor li[data-list="unchecked"] {
          list-style-type: none !important;
          padding-left: 2.2em !important; 
          position: relative !important;
          padding-top: 0.3em !important;
          padding-bottom: 0.3em !important;
        }

        /* 2. Make the original Quill checkbox invisible but keep it clickable */
        .ql-editor li[data-list="checked"] > .ql-ui,
        .ql-editor li[data-list="unchecked"] > .ql-ui {
          opacity: 0 !important;
          position: absolute !important;
          left: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          width: 1.5em !important;
          height: 1.5em !important;
          cursor: pointer !important;
          z-index: 10 !important;
        }

        /* 3. Hide any potential ::marker */
        .ql-editor li[data-list="checked"]::marker,
        .ql-editor li[data-list="unchecked"]::marker {
          content: "" !important;
          display: none !important;
        }

        /* 4. Custom Checkbox - Unchecked (visual only, behind invisible clickable) */
        .ql-editor li[data-list="unchecked"]::before {
          content: '\\2610' !important;
          position: absolute !important;
          left: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          font-size: 1.5em !important;
          line-height: 1em !important;
          color: ${isDark ? '#ffffff' : '#000000'} !important;
          pointer-events: none !important;
          font-weight: 900 !important;
          z-index: 1 !important;
        }

        /* 5. Custom Checkbox - Checked (visual only, behind invisible clickable) */
        .ql-editor li[data-list="checked"]::before {
          content: '\\2611' !important;
          position: absolute !important;
          left: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          font-size: 1.5em !important;
          line-height: 1em !important;
          color: ${isDark ? '#ffffff' : '#000000'} !important;
          pointer-events: none !important;
          font-weight: 900 !important;
          z-index: 1 !important;
        }
      `}</style>
    </div>
  );
}

export default QuillEditor;
