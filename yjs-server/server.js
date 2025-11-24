const { Server } = require('@hocuspocus/server');
const { Database } = require('@hocuspocus/extension-database');
const { Pool } = require('pg');
const { validateToken } = require('./auth');
const { createDefaultIntroDocument } = require('./createDefaultContent');
const express = require('express');

const PORT = process.env.YJS_WS_PORT || 1234;
const HTTP_PORT = process.env.YJS_HTTP_PORT || 1235;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'notes',
  password: process.env.DB_PASSWORD || 'notespass',
  database: process.env.DB_NAME || 'notesdb'
});

console.log('[YJS] Initializing Hocuspocus with PostgreSQL persistence');

// Create Hocuspocus server
const server = Server.configure({
  port: PORT,
  
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        console.log(`[YJS] Fetching document: ${documentName}`);
        
        // Parse note ID from room name (format: w{workspace_id}_n{note_id})
        const match = documentName.match(/^w(\d+)_n(\d+)$/);
        if (!match) {
          console.error(`[YJS] Invalid room format: ${documentName}`);
          return null;
        }
        
        const noteId = parseInt(match[2], 10);
        
        try {
          const result = await pool.query(
            'SELECT content FROM notes WHERE id = $1',
            [noteId]
          );
          
          if (result.rows.length > 0 && result.rows[0].content) {
            const content = result.rows[0].content;
            console.log(`[YJS] Loaded ${content.length} bytes for ${documentName}`);
            return content;
          }
          
          console.log(`[YJS] No existing content for ${documentName}, starting fresh`);
          return null;
          
        } catch (error) {
          console.error(`[YJS] Error fetching ${documentName}:`, error);
          return null;
        }
      },
      
      store: async ({ documentName, state }) => {
        console.log(`[YJS] Storing document: ${documentName}`);
        
        // Parse note ID from room name
        const match = documentName.match(/^w(\d+)_n(\d+)$/);
        if (!match) {
          console.error(`[YJS] Invalid room format: ${documentName}`);
          return;
        }
        
        const noteId = parseInt(match[2], 10);
        
        try {
          await pool.query(
            'UPDATE notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [Buffer.from(state), noteId]
          );
          
          console.log(`[YJS] Saved ${state.length} bytes for ${documentName}`);
          
        } catch (error) {
          console.error(`[YJS] Error storing ${documentName}:`, error);
        }
      }
    })
  ],
  
  async onAuthenticate(data) {
    const { token, documentName } = data;
    
    console.log(`[YJS] Authentication attempt for room: ${documentName}`);
    
    if (!token) {
      console.error(`[YJS] No token provided for ${documentName}`);
      throw new Error('Authentication required');
    }
    
    // Validate token with Go backend
    const authResult = await validateToken(token, documentName);
    
    if (!authResult.valid) {
      console.error(`[YJS] Invalid token for ${documentName}`);
      throw new Error('Invalid or expired token');
    }
    
    console.log(`[YJS] User ${authResult.userId} authenticated for ${documentName}`);
    
    // Return user context (available in other hooks)
    return {
      user: {
        id: authResult.userId,
        workspaceId: authResult.workspaceId
      }
    };
  },
  
  async onConnect(data) {
    console.log(`[YJS] Client connected to ${data.documentName}`);
  },
  
  async onDisconnect(data) {
    console.log(`[YJS] Client disconnected from ${data.documentName}`);
  },
  
  async onLoadDocument(data) {
    console.log(`[YJS] Document loaded: ${data.documentName}`);
  },
  
  async onStoreDocument(data) {
    console.log(`[YJS] Document stored: ${data.documentName}`);
  }
});

// Start Hocuspocus WebSocket server
server.listen();
console.log(`[YJS] Hocuspocus server listening on port ${PORT}`);

// Create Express HTTP server for initialization endpoint
const app = express();
app.use(express.json());

/**
 * POST /initialize-document
 * Creates a new Yjs document with default intro content
 * Body: { "room_id": "w1_n1" }
 */
app.post('/initialize-document', async (req, res) => {
  const { room_id } = req.body;
  
  if (!room_id) {
    return res.status(400).json({ error: 'room_id required' });
  }
  
  // Parse note ID from room_id
  const match = room_id.match(/^w(\d+)_n(\d+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid room_id format' });
  }
  
  const noteId = parseInt(match[2], 10);
  
  try {
    console.log(`[YJS] Initializing default content for room: ${room_id}`);
    
    // Generate default content
    const defaultContent = createDefaultIntroDocument();
    
    // Store in database
    await pool.query(
      'UPDATE notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [Buffer.from(defaultContent), noteId]
    );
    
    console.log(`[YJS] Successfully initialized ${defaultContent.length} bytes for ${room_id}`);
    res.json({ success: true, message: 'Document initialized' });
    
  } catch (error) {
    console.error(`[YJS] Error initializing ${room_id}:`, error);
    res.status(500).json({ error: 'Failed to initialize document' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'yjs-server' });
});

app.listen(HTTP_PORT, () => {
  console.log(`[YJS] HTTP server listening on port ${HTTP_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[YJS] SIGTERM received, closing servers...');
  await server.destroy();
  await pool.end();
  console.log('[YJS] Servers closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[YJS] SIGINT received, closing servers...');
  await server.destroy();
  await pool.end();
  console.log('[YJS] Servers closed');
  process.exit(0);
});
