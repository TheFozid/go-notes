import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Quill editor and related libraries
          'quill': ['quill', 'quill-cursors', 'y-quill', 'katex'],
          // Separate Yjs collaboration libraries
          'yjs': ['yjs', '@hocuspocus/provider'],
          // Separate React and core dependencies
          'vendor': ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
})
