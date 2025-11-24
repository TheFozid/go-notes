import { useState } from 'react'

function App() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [noteOpen, setNoteOpen] = useState(true)

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="px-2 py-1 text-gray-600 hover:text-gray-900"
          >
            ☰
          </button>
          <span className="font-semibold text-gray-900">Workspace Name</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Username (Admin)</span>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="px-2 py-1 text-gray-600 hover:text-gray-900"
          >
            ⚙️
          </button>
          <button className="px-2 py-1 text-gray-600 hover:text-gray-900">
            Logout ↗
          </button>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel */}
        {leftPanelOpen && (
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-2">
              <p className="font-semibold text-gray-900">Left Panel Content</p>
              <p className="text-sm text-gray-600">Workspaces</p>
              <p className="text-sm text-gray-600">Folders</p>
              <p className="text-sm text-gray-600">Notes</p>
              {Array.from({ length: 50 }, (_, i) => (
                <p key={i} className="text-sm text-gray-400">
                  Item {i + 1}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Editor Container - CRITICAL: flex flex-col */}
        <div className="flex-1 flex flex-col min-h-0">
          {noteOpen ? (
            <>
              {/* Note Editor - takes flexible space */}
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                {/* Title */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200" style={{ backgroundColor: '#D1E7FF' }}>
                  <h1 className="text-2xl font-bold text-gray-900">Note Title</h1>
                </div>
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <p className="text-gray-700 mb-4">Note content goes here...</p>
                  {Array.from({ length: 50 }, (_, i) => (
                    <p key={i} className="text-gray-600 mb-2">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Line {i + 1}
                    </p>
                  ))}
                </div>
              </div>

              {/* Toolbar - SIBLING, fixed height */}
              <div className="flex-shrink-0 h-14 flex items-center px-4 gap-4 border-t border-gray-300" style={{ backgroundColor: '#FFF9C4' }}>
                <button className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  ↶ Undo
                </button>
                <button className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  ↷ Redo
                </button>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex gap-2">
                  {['#FFFFFF', '#FFF9C4', '#FFE0E0', '#D1E7FF', '#D4EDDA', '#FFE5CC', '#E8DAEF', '#D5F5E3', '#FADBD8'].map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded border-2 border-gray-400 hover:border-gray-600"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white text-gray-400">
              <p>Select a note to start editing</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {rightPanelOpen && (
          <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-2">
              <p className="font-semibold text-gray-900">Right Panel Content</p>
              <p className="text-sm text-gray-600">Settings</p>
              <p className="text-sm text-gray-600">User Management</p>
              <p className="text-sm text-gray-600">Account</p>
              {Array.from({ length: 50 }, (_, i) => (
                <p key={i} className="text-sm text-gray-400">
                  Setting {i + 1}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Debug Controls */}
      <div className="h-8 bg-gray-800 text-white px-4 text-xs flex items-center gap-4 flex-shrink-0">
        <button onClick={() => setNoteOpen(!noteOpen)} className="underline hover:text-gray-300">
          Toggle Note: {noteOpen ? 'Open' : 'Closed'}
        </button>
        <span className="text-gray-400">|</span>
        <span>Left: {leftPanelOpen ? 'Open' : 'Closed'}</span>
        <span>Right: {rightPanelOpen ? 'Open' : 'Closed'}</span>
      </div>
    </div>
  )
}

export default App
