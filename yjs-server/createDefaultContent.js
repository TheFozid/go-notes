const Y = require('yjs');
const Delta = require('quill-delta');

/**
 * Creates a Yjs document with comprehensive intro content for new users
 * @returns {Uint8Array} Binary Yjs document state
 */
function createDefaultIntroDocument() {
  const ydoc = new Y.Doc();
  const ytext = ydoc.getText('quill');
  
  // Build Quill Delta operations for formatted content
  const delta = new Delta([
    // Title - H1
    { insert: 'Welcome to go-notes! 🎉' },
    { insert: '\n', attributes: { header: 1 } },
    { insert: '\n' },
    
    // Introduction
    { insert: 'go-notes is a collaborative note-taking application with real-time editing, rich formatting, and powerful organisation features.', attributes: { bold: true } },
    { insert: '\n\n' },
    
    // UI Overview Section - H2
    { insert: 'User Interface Overview' },
    { insert: '\n', attributes: { header: 2 } },
    
    { insert: 'Top Bar', attributes: { bold: true } },
    { insert: '\n' },
    { insert: '• Shows your current location: Workspace → Folder → Note\n' },
    { insert: '• Left panel toggle (', attributes: {} },
    { insert: 'left_panel_open', attributes: { code: true } },
    { insert: ') - Access workspaces, tags, and search\n' },
    { insert: '• Right panel toggle (', attributes: {} },
    { insert: 'settings', attributes: { code: true } },
    { insert: ') - Manage users and account settings\n' },
    { insert: '• Logout button\n\n' },
    
    { insert: 'Left Panel', attributes: { bold: true, underline: true } },
    { insert: '\n' },
    { insert: 'Workspaces & Notes', attributes: { italic: true } },
    { insert: '\n' },
    { insert: '• ' },
    { insert: 'Workspaces', attributes: { bold: true } },
    { insert: ' organise your notes (book icon 📚)\n' },
    { insert: '• ' },
    { insert: 'Folders', attributes: { bold: true } },
    { insert: ' provide unlimited nesting (folder icon 📁)\n' },
    { insert: '• ' },
    { insert: 'Notes', attributes: { bold: true } },
    { insert: ' show colour indicators when customised\n' },
    { insert: '• Right-click any item for context menu with actions\n' },
    { insert: '• Crown icon (👑) = workspace owner, Badge = member\n\n' },
    
    { insert: 'Tags Section', attributes: { italic: true } },
    { insert: '\n' },
    { insert: '• View all tags across your workspaces\n' },
    { insert: '• Click to expand and see notes with each tag\n' },
    { insert: '• Shows note count per tag\n\n' },
    
    { insert: 'Search Section', attributes: { italic: true } },
    { insert: '\n' },
    { insert: '• Search note titles and tags across all workspaces\n' },
    { insert: '• 500ms debounce for smooth typing\n' },
    { insert: '• Click any result to open that note\n\n' },
    
    { insert: 'Trash', attributes: { italic: true } },
    { insert: '\n' },
    { insert: '• Deleted notes go to trash (soft-delete)\n' },
    { insert: '• Restore notes or empty trash permanently\n' },
    { insert: '• Auto-delete after 30 days (configurable)\n\n' },
    
    // Collaboration Section - H2
    { insert: 'Real-Time Collaboration ✨' },
    { insert: '\n', attributes: { header: 2 } },
    
    { insert: 'Multiple users can edit the same note simultaneously!\n\n' },
    
    { insert: 'Features:', attributes: { bold: true } },
    { insert: '\n' },
    { insert: '• ', attributes: {} },
    { insert: 'Instant sync', attributes: { bold: true } },
    { insert: ' - Changes appear immediately for all users\n' },
    { insert: '• ', attributes: {} },
    { insert: 'Cursor tracking', attributes: { bold: true } },
    { insert: ' - See where others are typing (colour-coded)\n' },
    { insert: '• ', attributes: {} },
    { insert: 'Per-user undo/redo', attributes: { bold: true } },
    { insert: ' - Your undo history is separate from others\n' },
    { insert: '• ', attributes: {} },
    { insert: 'Automatic conflict resolution', attributes: { bold: true } },
    { insert: ' - CRDT technology handles concurrent edits\n' },
    { insert: '• ', attributes: {} },
    { insert: 'Offline editing', attributes: { bold: true } },
    { insert: ' - Edit offline, auto-syncs when reconnected\n\n' },
    
    { insert: 'Try it: Open this note on another device or share with a colleague!', attributes: { italic: true, background: '#fff9c4' } },
    { insert: '\n\n' },
    
    // Editor Section - H2
    { insert: 'Rich Text Editor' },
    { insert: '\n', attributes: { header: 2 } },
    
    { insert: 'The toolbar at the bottom provides extensive formatting options:\n\n' },
    
    // Text Styles - H3
    { insert: 'Text Styles' },
    { insert: '\n', attributes: { header: 3 } },
    { insert: 'Bold text', attributes: { bold: true } },
    { insert: ' | ' },
    { insert: 'Italic text', attributes: { italic: true } },
    { insert: ' | ' },
    { insert: 'Underlined text', attributes: { underline: true } },
    { insert: ' | ' },
    { insert: 'Strikethrough text', attributes: { strike: true } },
    { insert: '\n' },
    { insert: 'Inline code', attributes: { code: true } },
    { insert: ' | ' },
    { insert: 'Superscript', attributes: { script: 'super' } },
    { insert: ' | ' },
    { insert: 'Subscript', attributes: { script: 'sub' } },
    { insert: '\n\n' },
    
    // Headings - H3
    { insert: 'Headings' },
    { insert: '\n', attributes: { header: 3 } },
    { insert: 'Heading 1' },
    { insert: '\n', attributes: { header: 1 } },
    { insert: 'Heading 2' },
    { insert: '\n', attributes: { header: 2 } },
    { insert: 'Heading 3' },
    { insert: '\n', attributes: { header: 3 } },
    { insert: '\n' },
    
    // Colours - H3
    { insert: 'Colours' },
    { insert: '\n', attributes: { header: 3 } },
    { insert: 'Text colours: ', attributes: {} },
    { insert: 'Red', attributes: { color: '#e74c3c' } },
    { insert: ', ' },
    { insert: 'Blue', attributes: { color: '#3498db' } },
    { insert: ', ' },
    { insert: 'Green', attributes: { color: '#27ae60' } },
    { insert: '\n' },
    { insert: 'Background highlights: ', attributes: {} },
    { insert: 'Yellow', attributes: { background: '#fff9c4' } },
    { insert: ', ' },
    { insert: 'Pink', attributes: { background: '#ffe0e0' } },
    { insert: ', ' },
    { insert: 'Blue', attributes: { background: '#d1e7ff' } },
    { insert: '\n\n' },
    
    // Lists - H3
    { insert: 'Lists' },
    { insert: '\n', attributes: { header: 3 } },
    { insert: 'Bullet list item 1' },
    { insert: '\n', attributes: { list: 'bullet' } },
    { insert: 'Bullet list item 2' },
    { insert: '\n', attributes: { list: 'bullet' } },
    { insert: 'Numbered list item 1' },
    { insert: '\n', attributes: { list: 'ordered' } },
    { insert: 'Numbered list item 2' },
    { insert: '\n', attributes: { list: 'ordered' } },
    { insert: 'Checklist item (click to check!)' },
    { insert: '\n', attributes: { list: 'checked' } },
    { insert: 'Another checklist item' },
    { insert: '\n', attributes: { list: 'unchecked' } },
    { insert: '\n' },
    
    // Alignment - H3
    { insert: 'Alignment' },
    { insert: '\n', attributes: { header: 3 } },
    { insert: 'Left-aligned text (default)' },
    { insert: '\n', attributes: { align: 'left' } },
    { insert: 'Centre-aligned text' },
    { insert: '\n', attributes: { align: 'center' } },
    { insert: 'Right-aligned text' },
    { insert: '\n', attributes: { align: 'right' } },
    { insert: 'Justified text looks great for paragraphs with multiple lines that need even spacing on both sides' },
    { insert: '\n', attributes: { align: 'justify' } },
    { insert: '\n' },
    
    // Code Blocks - H3
    { insert: 'Code Blocks' },
    { insert: '\n', attributes: { header: 3 } },
    { insert: 'function hello() {' },
    { insert: '\n', attributes: { 'code-block': true } },
    { insert: '  console.log("Hello, go-notes!");' },
    { insert: '\n', attributes: { 'code-block': true } },
    { insert: '}' },
    { insert: '\n', attributes: { 'code-block': true } },
    { insert: '\n' },
    
    // Blockquotes - H3
    { insert: 'Blockquotes' },
    { insert: '\n', attributes: { header: 3 } },
    { insert: 'This is a blockquote. Perfect for highlighting important information or quotes from other sources.' },
    { insert: '\n', attributes: { blockquote: true } },
    { insert: '\n' },
    
    // Note Features Section - H2
    { insert: 'Note Features' },
    { insert: '\n', attributes: { header: 2 } },
    
    { insert: 'Note Colours', attributes: { bold: true } },
    { insert: '\n' },
    { insert: 'Click the colour picker in the toolbar to choose from 9 post-it style colours:\n' },
    { insert: '🟨 Yellow  🩷 Pink  🔵 Blue  🟢 Green  🟠 Orange  🟣 Purple  🟩 Mint  🟧 Peach  ⬜ White\n\n' },
    
    { insert: 'Tags', attributes: { bold: true } },
    { insert: '\n' },
    { insert: 'Add tags to organise notes across workspaces:\n' },
    { insert: '• Click the tags dropdown in toolbar\n' },
    { insert: '• Type to add new tags or select existing\n' },
    { insert: '• Tags are case-insensitive and auto-created\n' },
    { insert: '• View all notes with a tag in the Tags section\n\n' },
    
    // Keyboard Shortcuts Section - H2
    { insert: 'Keyboard Shortcuts ⌨️' },
    { insert: '\n', attributes: { header: 2 } },
    { insert: 'Ctrl+B', attributes: { code: true } },
    { insert: ' - Bold\n' },
    { insert: 'Ctrl+I', attributes: { code: true } },
    { insert: ' - Italic\n' },
    { insert: 'Ctrl+U', attributes: { code: true } },
    { insert: ' - Underline\n' },
    { insert: 'Ctrl+Z', attributes: { code: true } },
    { insert: ' - Undo (your changes only)\n' },
    { insert: 'Ctrl+Y', attributes: { code: true } },
    { insert: ' - Redo\n' },
    { insert: 'Ctrl+Shift+7', attributes: { code: true } },
    { insert: ' - Numbered list\n' },
    { insert: 'Ctrl+Shift+8', attributes: { code: true } },
    { insert: ' - Bullet list\n\n' },
    
    // Tips Section - H2
    { insert: '💡 Pro Tips' },
    { insert: '\n', attributes: { header: 2 } },
    { insert: '• Right-click anywhere in the left panel for quick actions\n' },
    { insert: '• Use folders to organise notes hierarchically (unlimited nesting!)\n' },
    { insert: '• Share workspaces with colleagues for collaboration\n' },
    { insert: '• Search is your friend - finds notes by title or tag instantly\n' },
    { insert: '• Notes in trash auto-delete after 30 days\n' },
    { insert: '• The toolbar scrolls horizontally - try scrolling to see all options!\n\n' },
    
    // Footer
    { insert: 'Ready to start? Create your first note or explore the features above!', attributes: { bold: true, italic: true, background: '#d4edda' } },
    { insert: '\n' }
  ]);
  
  // Apply delta to ytext
  delta.ops.forEach(op => {
    if (typeof op.insert === 'string') {
      ytext.insert(ytext.length, op.insert, op.attributes || {});
    }
  });
  
  // Return binary state
  return Y.encodeStateAsUpdate(ydoc);
}

module.exports = { createDefaultIntroDocument };
