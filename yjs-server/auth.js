const axios = require('axios');

/**
 * Validates a JWT token with the Go backend
 * @param {string} token - JWT token from client
 * @param {string} roomId - Yjs room ID (format: w{workspace_id}_n{note_id})
 * @returns {Promise<{valid: boolean, userId?: number, workspaceId?: number}>}
 */
async function validateToken(token, roomId) {
  const backendUrl = process.env.GO_BACKEND_URL || 'http://backend:8080';
  const apiBasePath = process.env.API_BASE_PATH || '/';
  
  // Parse workspace_id from room ID (format: w{workspace_id}_n{note_id})
  const match = roomId.match(/^w(\d+)_n(\d+)$/);
  if (!match) {
    console.error(`[AUTH] Invalid room ID format: ${roomId}`);
    return { valid: false };
  }
  
  const workspaceId = parseInt(match[1], 10);
  const noteId = parseInt(match[2], 10);
  
  try {
    // Call Go backend validation endpoint
    const response = await axios.post(
      `${backendUrl}${apiBasePath}/validate-yjs-token`,
      {
        room_id: roomId,
        workspace_id: workspaceId,
        note_id: noteId
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    
    if (response.status === 200 && response.data.valid) {
      console.log(`[AUTH] Token validated for user ${response.data.user_id} in room ${roomId}`);
      return {
        valid: true,
        userId: response.data.user_id,
        workspaceId: workspaceId
      };
    }
    
    console.warn(`[AUTH] Token validation failed for room ${roomId}`);
    return { valid: false };
    
  } catch (error) {
    if (error.response) {
      console.error(`[AUTH] Backend returned ${error.response.status} for room ${roomId}`);
    } else if (error.request) {
      console.error(`[AUTH] No response from backend for room ${roomId}:`, error.message);
    } else {
      console.error(`[AUTH] Validation error for room ${roomId}:`, error.message);
    }
    return { valid: false };
  }
}

module.exports = { validateToken };
