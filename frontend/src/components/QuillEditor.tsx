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
import { useConnectionStore } from '../store/connectionStore';
import { notifyError } from '../store/dialogStore';
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

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

/*
 * Same user always gets the same cursor colour. Previously this was random per
 * connection, so a person's colour changed every time they switched notes or
 * reconnected, which makes collaborators hard to follow.
 */
function getCursorColor(userId: number): string {
  return CURSOR_COLORS[Math.abs(userId) % CURSOR_COLORS.length];
}

function QuillEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const bindingRef = useRef<QuillBinding | null>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const titleSaveRef = useRef<number | undefined>(undefined);
  
  const selectedNoteId = useWorkspaceStore((state) => state.selectedNoteId);
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const { isDark } = useThemeStore();
  const [currentNoteColor, setCurrentNoteColor] = useState<string>('#FFFFFF');
  const [currentNoteTags, setCurrentNoteTags] = useState<string[]>([]);
  const setConnectionStatus = useConnectionStore((state) => state.setStatus);
  const connectionStatus = useConnectionStore((state) => state.status);
  const isLoadingNote = connectionStatus === 'loading';
  const [moreOpen, setMoreOpen] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('[QuillEditor] Creating Quill instance');
    
    const toolbarElement = document.querySelector('#toolbar-container');
    if (toolbarElement) {
      toolbarElement.innerHTML = `
        <span class="ql-formats" data-group="primary">
          <select class="ql-header">
            <option value="1"></option>
            <option value="2"></option>
            <option value="3"></option>
            <option selected></option>
          </select>
        </span>
        <span class="ql-formats" data-group="primary">
          <button class="ql-bold"></button>
          <button class="ql-italic"></button>
          <button class="ql-underline"></button>
          <button class="ql-strike"></button>
        </span>
        <span class="ql-formats" data-group="primary">
          <button class="ql-list" value="ordered"></button>
          <button class="ql-list" value="bullet"></button>
          <button class="ql-list" value="check"></button>
        </span>
        <span class="ql-formats" data-group="primary">
          <button class="ql-blockquote"></button>
          <button class="ql-code-block"></button>
        </span>
        <span class="ql-formats" data-group="primary">
          <button class="ql-link"></button>
          <button class="ql-image"></button>
        </span>
        <span class="ql-formats" data-group="more">
          <select class="ql-font"></select>
          <select class="ql-size">
            <option value="small"></option>
            <option selected></option>
            <option value="large"></option>
            <option value="huge"></option>
          </select>
        </span>
        <span class="ql-formats" data-group="more">
          <select class="ql-color"></select>
          <select class="ql-background"></select>
        </span>
        <span class="ql-formats" data-group="more">
          <button class="ql-script" value="sub"></button>
          <button class="ql-script" value="super"></button>
          <button class="ql-code"></button>
        </span>
        <span class="ql-formats" data-group="more">
          <select class="ql-align"></select>
          <button class="ql-indent" value="-1"></button>
          <button class="ql-indent" value="+1"></button>
        </span>
        <span class="ql-formats" data-group="more">
          <button class="ql-video"></button>
          <button class="ql-formula"></button>
          <button class="ql-table-better"></button>
        </span>
        <span class="ql-formats" data-group="more">
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

    /*
     * Relocate the rarely used groups into the "More" panel. This has to happen
     * after Quill's constructor, which attaches a listener to every button and
     * turns each select into a picker. Those listeners live on the elements, so
     * moving the elements keeps both the handlers and their active state.
     */
    if (morePanelRef.current) {
      const overflow = document.querySelectorAll('#toolbar-container .ql-formats[data-group="more"]');
      overflow.forEach((group) => morePanelRef.current!.appendChild(group));
    }

    const onToolbarClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const picker = target.closest('.ql-picker');
      if (!picker) return;
      setTimeout(() => {
        const pickerOptions = picker.querySelector('.ql-picker-options') as HTMLElement;
        if (!pickerOptions || !picker.classList.contains('ql-expanded')) return;
        const pickerLabel = picker.querySelector('.ql-picker-label') as HTMLElement;
        if (!pickerLabel) return;
        const rect = pickerLabel.getBoundingClientRect();
        pickerOptions.style.position = 'fixed';
        pickerOptions.style.top = `${rect.bottom}px`;
        pickerOptions.style.right = 'auto';
        pickerOptions.style.width = 'auto';
        pickerOptions.style.minWidth = `${rect.width}px`;
        pickerOptions.style.maxWidth = '300px';
        const optionsWidth = Math.min(pickerOptions.offsetWidth || rect.width, 300);
        const maxLeft = window.innerWidth - optionsWidth - 8;
        pickerOptions.style.left = `${Math.max(8, Math.min(rect.left, maxLeft))}px`;
      }, 10);
    };

    const morePanel = morePanelRef.current;
    const toolbarContainer = document.querySelector('#toolbar-container');
    toolbarContainer?.addEventListener('click', onToolbarClick);
    morePanel?.addEventListener('click', onToolbarClick);

    return () => {
      console.log('[QuillEditor] Unmounting - destroying Quill');
      // Previously this listener was never removed
      toolbarContainer?.removeEventListener('click', onToolbarClick);
      morePanel?.removeEventListener('click', onToolbarClick);
      quillRef.current = null;
    };
  }, []);

  // Close the More panel on an outside click or Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (morePanelRef.current?.contains(target) || moreButtonRef.current?.contains(target)) return;
      // Pickers render their options with position: fixed outside the panel
      if ((e.target as HTMLElement).closest?.('.ql-picker-options')) return;
      setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

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
      setConnectionStatus('idle');
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

    /*
     * From here until the new binding exists there is no document behind the
     * editor: fetching metadata and the first sync can take seconds. Keeping
     * Quill editable meant anything typed in that window went nowhere and was
     * wiped when the new note loaded. Lock it and clear the old note's text so
     * it isn't mistaken for the one being opened.
     */
    quillRef.current.enable(false);
    quillRef.current.setText('');
    setConnectionStatus('loading');

    const noteId = selectedNoteId;
    const workspaceId = selectedWorkspaceId;
    
    let cancelled = false;

    function onProviderStatus({ status }: { status: string }) {
      if (cancelled) return;
      if (status === 'connected') setConnectionStatus('connected');
      else if (status === 'connecting') setConnectionStatus('connecting');
      else setConnectionStatus('offline');
    }

    function onProviderDisconnect() {
      if (!cancelled) setConnectionStatus('offline');
    }

    async function connectToNote() {
      try {
        console.log('[QuillEditor] Fetching note metadata...');
        
        const noteData = await getNote(workspaceId, noteId);
        
        console.log('[QuillEditor] Note metadata received:', noteData);

        setCurrentNoteColor(noteData.color);
        setCurrentNoteTags(noteData.tags?.map(t => t.name) || []);
        setTitle(noteData.title);

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
            color: getCursorColor(user.id)
          });
        }

        const binding = new QuillBinding(ytext, quillRef.current!, provider.awareness ?? undefined);
        
        console.log('[QuillEditor] Binding created');

        if (containerRef.current) {
          containerRef.current.style.backgroundColor = getNoteColor(noteData.color, isDark);
        }

        if (!cancelled) {
          providerRef.current = provider;
          bindingRef.current = binding;

          // Document is attached, so typing is safe again
          quillRef.current!.enable(true);
          setConnectionStatus(provider.isConnected ? 'connected' : 'offline');

          // Keep the top bar honest for the rest of the session
          provider.on('status', onProviderStatus);
          provider.on('disconnect', onProviderDisconnect);

          console.log('[QuillEditor] Connection complete');
        } else {
          console.log('[QuillEditor] Connection cancelled, cleaning up');
          binding.destroy();
          provider.destroy();
        }

      } catch (error) {
        if (!cancelled) {
          console.error('[QuillEditor] Failed to connect to note:', error);
          // Editing offline still beats a frozen editor: edits are held in the
          // Yjs doc and sent when the connection returns
          quillRef.current?.enable(true);
          setConnectionStatus('offline');
        }
      }
    }

    connectToNote();

    return () => {
      cancelled = true;
      console.log('[QuillEditor] Effect cleanup - cancelling async operation');

      /*
       * Previously this only set the flag, so on unmount (logging out, or the
       * editor being replaced) the socket stayed open and this user lingered in
       * everyone else's cursor list. Tear the connection down here instead; the
       * next run re-creates it.
       */
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.off('status', onProviderStatus);
        providerRef.current.off('disconnect', onProviderDisconnect);
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [selectedNoteId, selectedWorkspaceId, token, user, setConnectionStatus]);

  // Update editor background when theme changes
  useEffect(() => {
    if (containerRef.current && selectedNoteId) {
      containerRef.current.style.backgroundColor = getNoteColor(currentNoteColor, isDark);
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


  /*
   * Saves after a pause rather than on every keystroke. Titles are metadata in
   * Postgres, not part of the collaborative document, so a title edited by two
   * people at once is last-write-wins and won't appear live for the other.
   */
  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    if (!selectedNoteId || !selectedWorkspaceId) return;

    const noteId = selectedNoteId;
    const workspaceId = selectedWorkspaceId;
    window.clearTimeout(titleSaveRef.current);
    titleSaveRef.current = window.setTimeout(() => {
      saveTitle(workspaceId, noteId, newTitle);
    }, 800);
  }

  async function saveTitle(workspaceId: number, noteId: number, newTitle: string) {
    const trimmed = newTitle.trim() || 'Untitled';
    const existing = useWorkspaceStore.getState().getNoteById(noteId);
    if (existing?.title === trimmed) return;

    try {
      await updateNote(workspaceId, noteId, { title: trimmed });
      useWorkspaceStore.getState().updateNote(noteId, { title: trimmed });
    } catch (error) {
      console.error('[QuillEditor] Failed to save title:', error);
      notifyError('Could not save the note title');
    }
  }

  function commitTitle() {
    if (!selectedNoteId || !selectedWorkspaceId) return;
    window.clearTimeout(titleSaveRef.current);
    const trimmed = title.trim() || 'Untitled';
    if (trimmed !== title) setTitle(trimmed);
    saveTitle(selectedWorkspaceId, selectedNoteId, trimmed);
  }

  // Don't leave an unsaved title behind when switching notes or unmounting
  useEffect(() => {
    return () => window.clearTimeout(titleSaveRef.current);
  }, []);

  async function handleColorChange(newColor: string) {
    if (!selectedNoteId || !selectedWorkspaceId) return;
    
    try {
      console.log('[QuillEditor] Changing note color to:', newColor);
      
      await updateNote(selectedWorkspaceId, selectedNoteId, { color: newColor });
      setCurrentNoteColor(newColor);

      useWorkspaceStore.getState().updateNote(selectedNoteId, { color: newColor });
      
      if (containerRef.current) {
        containerRef.current.style.backgroundColor = getNoteColor(newColor, isDark);
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
      {/* Note header: title, tags, colour, then formatting */}
      <div
        className="editor-header"
        style={{ display: selectedNoteId ? 'block' : 'none' }}
      >
        <div className="editor-header-inner">
          <input
            className="note-title-input"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
                quillRef.current?.focus();
              }
            }}
            placeholder="Untitled"
            aria-label="Note title"
          />

          <div className="note-meta-row">
            <TagInput
              currentTags={currentNoteTags}
              onTagsChange={handleTagsChange}
            />
            <ColorPicker
              currentColor={currentNoteColor}
              onColorChange={handleColorChange}
              isDark={isDark}
            />
            <div className="note-meta-spacer" />
            <div className="history-buttons">
              <button className="icon-btn" onClick={handleUndo} title="Undo" aria-label="Undo">
                <span className="material-symbols-outlined">undo</span>
              </button>
              <button className="icon-btn" onClick={handleRedo} title="Redo" aria-label="Redo">
                <span className="material-symbols-outlined">redo</span>
              </button>
            </div>
          </div>

          <div className="toolbar-row">
            <div className="toolbar-scroll">
              <div id="toolbar-container" />
            </div>

            <button
              ref={moreButtonRef}
              className={`icon-btn toolbar-more-btn${moreOpen ? ' is-open' : ''}`}
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              aria-label="More formatting options"
              title="More formatting options"
            >
              <span className="material-symbols-outlined">more_horiz</span>
            </button>

            {/* Always in the DOM: Quill's buttons are moved in here at startup
                and must not be unmounted, so visibility is toggled with CSS */}
            <div
              ref={morePanelRef}
              className={`toolbar-more-panel ql-toolbar ql-snow${moreOpen ? ' is-open' : ''}`}
              aria-hidden={!moreOpen}
            />
          </div>
        </div>
      </div>

      {!selectedNoteId && (
        <div style={{ 
          padding: '48px 32px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          position: 'absolute',
          width: '100%',
          zIndex: 10
        }}>
          <span className="material-symbols-outlined" style={{ 
            fontSize: '64px',
            color: 'var(--text-tertiary)',
            marginBottom: '16px',
            display: 'block'
          }}>
            description
          </span>
          <div style={{ 
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--text-secondary)'
          }}>
            Select a note to start editing
          </div>
        </div>
      )}
      
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
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

        {isLoadingNote && (
          <div className="editor-loading" aria-live="polite">
            <span className="material-symbols-outlined spin" aria-hidden="true">
              progress_activity
            </span>
            Opening note...
          </div>
        )}
      </div>
      
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
