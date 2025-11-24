import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import QuillCursors from 'quill-cursors';
import useWorkspaceStore from '../store/workspaceStore';
import useAuthStore from '../store/authStore';
import { getNote } from '../api/workspaces';
import 'quill/dist/quill.snow.css';
import 'katex/dist/katex.min.css';
import ColorPicker from './ColorPicker';
import { updateNote } from '../api/workspaces';
import TagInput from './TagInput';
import { setNoteTags } from '../api/workspaces';

Quill.register('modules/cursors', QuillCursors);

function QuillEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const bindingRef = useRef<QuillBinding | null>(null);
  
  const selectedNoteId = useWorkspaceStore((state) => state.selectedNoteId);
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
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
            editorDiv.style.backgroundColor = noteData.color;
            console.log('[QuillEditor] Applied color:', noteData.color);
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
          editorDiv.style.backgroundColor = newColor;
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

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff'
    }}>
      {/* Toolbar row with Quill toolbar + Tags + Color Picker */}
      <div style={{
        display: selectedNoteId ? 'flex' : 'none',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 16px',
        gap: '12px',
        flexShrink: 0
      }}>
        {/* Scrollable Quill toolbar */}
        <div style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'visible',
          minWidth: 0,
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

        {/* Separator */}
        <div style={{
          width: '1px',
          height: '32px',
          backgroundColor: '#e5e7eb',
          flexShrink: 0
        }} />

        {/* Tags and Color Picker */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexShrink: 0,
          position: 'relative',
          zIndex: 9999
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
    </div>
  );
}

export default QuillEditor;
