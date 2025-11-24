package integration

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
	"io"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	_ "github.com/lib/pq"
	"go-notes/backend/internal/db"
)

// Base URL for testing (your backend runs under /test)
const baseURL = "http://localhost:8060/test"

// Helper
func getStringField(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			if s, ok := v.(string); ok {
				return s
			}
		}
	}
	return ""
}


// ---------------------
// Utility Functions
// ---------------------

func printError(resp *http.Response) {
	var body map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	fmt.Printf("Status: %d\nBody: %+v\n", resp.StatusCode, body)
}

func setupAdmin(t *testing.T) {
	client := &http.Client{}
	req := map[string]string{"username": "admin", "password": "supersecret"}
	buf := new(bytes.Buffer)
	_ = json.NewEncoder(buf).Encode(req)
	resp, err := client.Post(baseURL+"/setup", "application/json", buf)
	assert.NoError(t, err)
	if resp.StatusCode != 200 && resp.StatusCode != 403 {
		printError(resp)
		t.Fatalf("Admin setup failed: %s", resp.Status)
	}
}

func getToken(t *testing.T, username, password string) string {
	client := &http.Client{}
	req := map[string]string{"username": username, "password": password}
	buf := new(bytes.Buffer)
	_ = json.NewEncoder(buf).Encode(req)
	resp, err := client.Post(baseURL+"/login", "application/json", buf)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
	var body struct {
		Token string `json:"token"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	return body.Token
}

// Handles both ID/id and Username/username key styles
func getUserID(t *testing.T, token, username string) int {
	client := &http.Client{}
	req, _ := http.NewRequest("GET", baseURL+"/users/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var users []map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&users)

	for _, u := range users {
		var uname string
		if v, ok := u["username"].(string); ok {
			uname = v
		} else if v, ok := u["Username"].(string); ok {
			uname = v
		}
		if uname == username {
			if idf, ok := u["id"].(float64); ok {
				return int(idf)
			}
			if idf, ok := u["ID"].(float64); ok {
				return int(idf)
			}
		}
	}
	t.Fatalf("User %s not found in /users/ response", username)
	return -1
}

func createWorkspace(t *testing.T, token, name string) int {
	client := &http.Client{}
	req := map[string]string{"name": name}
	buf := new(bytes.Buffer)
	_ = json.NewEncoder(buf).Encode(req)
	request, _ := http.NewRequest("POST", baseURL+"/workspaces", buf)
	request.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(request)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	var ws struct{ ID int `json:"id"` }
	_ = json.NewDecoder(resp.Body).Decode(&ws)
	return ws.ID
}

func createFolder(t *testing.T, token string, wsID int, name string, parentID *int) int {
	client := &http.Client{}
	req := map[string]interface{}{"name": name}
	if parentID != nil {
		req["parent_id"] = *parentID
	}
	buf := new(bytes.Buffer)
	_ = json.NewEncoder(buf).Encode(req)
	request, _ := http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/folders", baseURL, wsID), buf)
	request.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(request)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)
	var folder struct{ ID int `json:"id"` }
	_ = json.NewDecoder(resp.Body).Decode(&folder)
	return folder.ID
}

func createNote(t *testing.T, token string, wsID int, title, content string, folderID *int, tags []string) int {
	client := &http.Client{}
	req := map[string]interface{}{
		"title":   title,
		"content": content,
	}
	if folderID != nil {
		req["folder_id"] = *folderID
	}
	if tags != nil {
		req["tags"] = tags
	}
	buf := new(bytes.Buffer)
	_ = json.NewEncoder(buf).Encode(req)
	request, _ := http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/notes", baseURL, wsID), buf)
	request.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(request)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)
	var note struct{ ID int `json:"id"` }
	_ = json.NewDecoder(resp.Body).Decode(&note)
	return note.ID
}

func getNote(t *testing.T, token string, wsID, noteID int) map[string]interface{} {
	client := &http.Client{}
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/workspaces/%d/notes/%d", baseURL, wsID, noteID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
	var note map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&note)
	return note
}

// ---------------------
// Tests
// ---------------------

func TestHealth(t *testing.T) {
	resp, err := http.Get(baseURL + "/health")
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
	var body map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	assert.Equal(t, "ok", body["status"])
}

func TestUserAdminFlow(t *testing.T) {
	setupAdmin(t)
	adminToken := getToken(t, "admin", "supersecret")

	client := &http.Client{}
	body := map[string]interface{}{"username": "user1", "password": "user1pass", "is_admin": false}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(body)
	req, _ := http.NewRequest("POST", baseURL+"/users/", buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	userToken := getToken(t, "user1", "user1pass")
	req, _ = http.NewRequest("GET", baseURL+"/users/", nil)
	req.Header.Set("Authorization", "Bearer "+userToken)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 403, resp.StatusCode)
}

func TestWorkspaceFlow(t *testing.T) {
	setupAdmin(t)
	adminToken := getToken(t, "admin", "supersecret")

	client := &http.Client{}
	reqBody := map[string]interface{}{"username": "member", "password": "mempass", "is_admin": false}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(reqBody)
	req, _ := http.NewRequest("POST", baseURL+"/users/", buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, _ := client.Do(req)
	assert.Equal(t, 201, resp.StatusCode)

	memberID := getUserID(t, adminToken, "member")
	memberToken := getToken(t, "member", "mempass")

	wsID := createWorkspace(t, adminToken, "TestWS")
	addReq := map[string]interface{}{"user_id": memberID, "role": "member"}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(addReq)
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/members", baseURL, wsID), buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)

	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/workspaces/%d/members", baseURL, wsID), nil)
	req.Header.Set("Authorization", "Bearer "+memberToken)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)
}

func TestNoteLifecycleAndTags(t *testing.T) {
	setupAdmin(t)
	token := getToken(t, "admin", "supersecret")
	wsID := createWorkspace(t, token, "NotesWS")

	folderID := createFolder(t, token, wsID, "Folder1", nil)
	noteID := createNote(t, token, wsID, "My Note", "Hello world", &folderID, []string{"Go", "Test"})

	note := getNote(t, token, wsID, noteID)

	title := note["Title"]
	if title == nil {
		title = note["title"]
	}
	assert.Equal(t, "My Note", title)
	content := note["Content"]
	if content == nil {
		content = note["content"]
	}
	assert.True(t, strings.Contains(content.(string), "Hello"))
}

func TestGranularNoteEventEdit(t *testing.T) {
	setupAdmin(t)
	token := getToken(t, "admin", "supersecret")
	wsID := createWorkspace(t, token, "EventWS")
	noteID := createNote(t, token, wsID, "Event Note", "abc", nil, nil)

	client := &http.Client{}
	event := map[string]interface{}{"op_type": "insert", "position": 1, "text": "X"}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(event)
	req, _ := http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/events", baseURL, wsID, noteID), buf)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

updated := getNote(t, token, wsID, noteID)
assert.Equal(t, "aXbc", getStringField(updated, "content", "Content"))

}

// ✅ New Undo/Redo integration test
func TestUndoRedoFlow(t *testing.T) {
	setupAdmin(t)
	token := getToken(t, "admin", "supersecret")
	wsID := createWorkspace(t, token, "UndoWS")
	noteID := createNote(t, token, wsID, "Undo Note", "abc", nil, nil)
	client := &http.Client{}

	// Apply an insert event
	event := map[string]interface{}{"op_type": "insert", "position": 1, "text": "X"}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(event)
	req, _ := http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/events", baseURL, wsID, noteID), buf)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	// Verify note content after insert
	note := getNote(t, token, wsID, noteID)
	content := note["content"]
	assert.Equal(t, "aXbc", getStringField(note, "content", "Content"))

	// Perform Undo
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/undo", baseURL, wsID, noteID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	note = getNote(t, token, wsID, noteID)
	content = note["content"]
	if content == nil {
		content = note["Content"]
	}
	assert.Equal(t, "abc", content)

	// Perform Redo
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/redo", baseURL, wsID, noteID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	note = getNote(t, token, wsID, noteID)
	content = note["content"]
	assert.Equal(t, "aXbc", getStringField(note, "content", "Content"))

// Verify history entries exist
req, _ = http.NewRequest("GET",
	fmt.Sprintf("%s/workspaces/%d/notes/%d/history", baseURL, wsID, noteID), nil)
req.Header.Set("Authorization", "Bearer "+token)
resp, err = client.Do(req)
assert.NoError(t, err)
assert.Equal(t, 200, resp.StatusCode)

var body struct {
	Events []map[string]interface{} `json:"events"`
}
_ = json.NewDecoder(resp.Body).Decode(&body)
assert.True(t, len(body.Events) >= 1, "expected at least one edit event in history")

}

func TestTrashAndRetention(t *testing.T) {
	setupAdmin(t)
	token := getToken(t, "admin", "supersecret")
	wsID := createWorkspace(t, token, "TrashWS")

	noteID := createNote(t, token, wsID, "Old Note", "Delete me", nil, nil)
	client := &http.Client{}

	req, _ := http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/notes/%d/trash", baseURL, wsID, noteID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ := client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)

	dbConn := connectDB(t)
	defer dbConn.Close()
	_, _ = dbConn.Exec("UPDATE notes SET trashed_at = NOW() - INTERVAL '31 days' WHERE id = $1", noteID)
	assert.NoError(t, db.AutoEmptyTrash(dbConn))

	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/workspaces/%d/trash", baseURL, wsID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)
	var notes []map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&notes)
	assert.Equal(t, 0, len(notes))
}

func TestUndoRedoMultiUserIsolation(t *testing.T) {
	setupAdmin(t)
	adminToken := getToken(t, "admin", "supersecret")

	// Create a second user
	client := &http.Client{}
	userBody := map[string]interface{}{"username": "user2", "password": "pass2", "is_admin": false}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(userBody)
	req, _ := http.NewRequest("POST", baseURL+"/users/", buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	user2Token := getToken(t, "user2", "pass2")
	user2ID := getUserID(t, adminToken, "user2")

	// Create workspace and share with user2
	wsID := createWorkspace(t, adminToken, "UndoIsolationWS")
	addReq := map[string]interface{}{"user_id": user2ID, "role": "member"}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(addReq)
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/members", baseURL, wsID), buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)

	// Admin creates a note and writes "hello there"
	noteID := createNote(t, adminToken, wsID, "Shared Note", "hello there", nil, nil)

	// user2 deletes "o there" and inserts " no"
	event := map[string]interface{}{"op_type": "delete", "position": 4, "length": 7}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(event)
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/events", baseURL, wsID, noteID), buf)
	req.Header.Set("Authorization", "Bearer "+user2Token)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	event = map[string]interface{}{"op_type": "insert", "position": 4, "text": " no"}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(event)
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/events", baseURL, wsID, noteID), buf)
	req.Header.Set("Authorization", "Bearer "+user2Token)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	// Verify final content: "hell no"
	note := getNote(t, adminToken, wsID, noteID)
	content := getStringField(note, "content", "Content")
	assert.Equal(t, "hell no", content)

	// Admin presses Undo — should revert their own "hello there" edit but not user2’s
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/undo", baseURL, wsID, noteID), nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	// Content should remain "hell no" since user2’s edits remain untouched
	note = getNote(t, adminToken, wsID, noteID)
	content = getStringField(note, "content", "Content")
	assert.Equal(t, "hell no", content)

	// user2 can now undo their last edit — should restore the deleted section
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/undo", baseURL, wsID, noteID), nil)
	req.Header.Set("Authorization", "Bearer "+user2Token)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	// user2 undoes again (their delete)
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/undo", baseURL, wsID, noteID), nil)
	req.Header.Set("Authorization", "Bearer "+user2Token)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	// After both of user2’s undos, content should return to "hello there"
	note = getNote(t, adminToken, wsID, noteID)
	content = getStringField(note, "content", "Content")
	assert.Equal(t, "hello there", content)
}


func TestRealtimeCollaboration(t *testing.T) {
	setupAdmin(t)
	adminToken := getToken(t, "admin", "supersecret")

	dbConn := connectDB(t)
	defer dbConn.Close()
	_, _ = dbConn.Exec("DELETE FROM users WHERE username = 'user2'")

	// Create second user
	client := &http.Client{}
	userBody := map[string]interface{}{"username": "user2", "password": "pass2", "is_admin": false}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(userBody)
	req, _ := http.NewRequest("POST", baseURL+"/users/", buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	user2Token := getToken(t, "user2", "pass2")
	user2ID := getUserID(t, adminToken, "user2")

	// Create workspace and share with user2
	wsID := createWorkspace(t, adminToken, "RealtimeWS")
	addReq := map[string]interface{}{"user_id": user2ID, "role": "member"}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(addReq)
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/members", baseURL, wsID), buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)

	// Create note
	noteID := createNote(t, adminToken, wsID, "Live Note", "abc", nil, nil)

	// Open WebSocket connections for both users
	wsURL := strings.Replace(baseURL, "http", "ws", 1)
	adminWS, _, err := websocket.DefaultDialer.Dial(
		fmt.Sprintf("%s/workspaces/%d/notes/%d/ws", wsURL, wsID, noteID),
		http.Header{"Authorization": []string{"Bearer " + adminToken}},
	)
	assert.NoError(t, err)
	defer adminWS.Close()

	// Admin receives presence_list
	adminWS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, _ = adminWS.ReadMessage()

	user2WS, _, err := websocket.DefaultDialer.Dial(
		fmt.Sprintf("%s/workspaces/%d/notes/%d/ws", wsURL, wsID, noteID),
		http.Header{"Authorization": []string{"Bearer " + user2Token}},
	)
	assert.NoError(t, err)
	defer user2WS.Close()

	// user2 receives presence_list
	user2WS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, _ = user2WS.ReadMessage()

	// admin receives user2's presence_update (join)
	adminWS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, _ = adminWS.ReadMessage()

	// admin sends an insert edit
	editMsg := map[string]interface{}{
		"type":         "edit",
		"workspace_id": wsID,
		"note_id":      noteID,
		"payload": map[string]interface{}{
			"op_type":  "insert",
			"position": 1,
			"length":   0,
			"text":     "X",
		},
	}
	assert.NoError(t, adminWS.WriteJSON(editMsg))

	// Wait for user2 to receive the edit_applied broadcast
	// May also receive presence updates, so loop until we get edit_applied
	user2WS.SetReadDeadline(time.Now().Add(2 * time.Second))
	var broadcast map[string]interface{}
	for i := 0; i < 5; i++ {
		_, msg, err := user2WS.ReadMessage()
		if err != nil {
			break
		}
		if err := json.Unmarshal(msg, &broadcast); err == nil {
			if broadcast["type"] == "edit_applied" {
				break
			}
		}
	}
	assert.Equal(t, "edit_applied", broadcast["type"])

	// Confirm persisted change via REST
	note := getNote(t, adminToken, wsID, noteID)
	content := getStringField(note, "content", "Content")
	assert.Equal(t, "aXbc", content)
}


func TestPresenceTracking(t *testing.T) {
	setupAdmin(t)
	adminToken := getToken(t, "admin", "supersecret")

	dbConn := connectDB(t)
	defer dbConn.Close()
	_, _ = dbConn.Exec("DELETE FROM users WHERE username = 'user3'")

	// Create second user
	client := &http.Client{}
	userBody := map[string]interface{}{"username": "user3", "password": "pass3", "is_admin": false}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(userBody)
	req, _ := http.NewRequest("POST", baseURL+"/users/", buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	user3Token := getToken(t, "user3", "pass3")
	user3ID := getUserID(t, adminToken, "user3")

	// Create workspace and share with user3
	wsID := createWorkspace(t, adminToken, "PresenceWS")
	addReq := map[string]interface{}{"user_id": user3ID, "role": "member"}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(addReq)
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/members", baseURL, wsID), buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)

	// Create note
	noteID := createNote(t, adminToken, wsID, "Presence Note", "test", nil, nil)

	// Connect admin WebSocket
	wsURL := strings.Replace(baseURL, "http", "ws", 1)
	adminWS, _, err := websocket.DefaultDialer.Dial(
		fmt.Sprintf("%s/workspaces/%d/notes/%d/ws", wsURL, wsID, noteID),
		http.Header{"Authorization": []string{"Bearer " + adminToken}},
	)
	assert.NoError(t, err)
	defer adminWS.Close()

	// Admin receives presence_list
	adminWS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, _ = adminWS.ReadMessage()

	// Connect user3 WebSocket
	user3WS, _, err := websocket.DefaultDialer.Dial(
		fmt.Sprintf("%s/workspaces/%d/notes/%d/ws", wsURL, wsID, noteID),
		http.Header{"Authorization": []string{"Bearer " + user3Token}},
	)
	assert.NoError(t, err)
	defer user3WS.Close()

	// user3 receives presence_list
	user3WS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, _ = user3WS.ReadMessage()

	// user3 also receives their own presence_update (from joining)
	user3WS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, _ = user3WS.ReadMessage()

	// Admin receives presence_update for user3 joining
	adminWS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, _ = adminWS.ReadMessage()

	// Admin sends cursor update
	presenceMsg := map[string]interface{}{
		"type":         "presence",
		"workspace_id": wsID,
		"note_id":      noteID,
		"payload": map[string]interface{}{
			"cursor":          50,
			"selection_start": 40,
			"selection_end":   60,
		},
	}
	assert.NoError(t, adminWS.WriteJSON(presenceMsg))

	// Admin receives their own presence_update broadcast
	adminWS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, _ = adminWS.ReadMessage()

	// user3 receives admin's presence update
	user3WS.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := user3WS.ReadMessage()
	assert.NoError(t, err)
	var cursorUpdate map[string]interface{}
	assert.NoError(t, json.Unmarshal(msg, &cursorUpdate))
	assert.Equal(t, "presence_update", cursorUpdate["type"])

	payload := cursorUpdate["payload"].(map[string]interface{})
	assert.Equal(t, float64(50), payload["cursor_pos"])
	assert.Equal(t, "admin", payload["username"])
	assert.NotEmpty(t, payload["color"])

	// Verify presence persisted in database
	var count int
	err = dbConn.QueryRow("SELECT COUNT(*) FROM note_presence WHERE note_id = $1", noteID).Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, 2, count)

	// Disconnect user3
	user3WS.Close()
	time.Sleep(200 * time.Millisecond)

	// Admin receives presence_left message
	adminWS.SetReadDeadline(time.Now().Add(2 * time.Second))
	var leftMsg map[string]interface{}
	for i := 0; i < 5; i++ {
		_, msg, err := adminWS.ReadMessage()
		if err != nil {
			break
		}
		if err := json.Unmarshal(msg, &leftMsg); err == nil {
			if leftMsg["type"] == "presence_left" {
				break
			}
		}
	}
	assert.Equal(t, "presence_left", leftMsg["type"])

	// Verify presence removed from database
	err = dbConn.QueryRow("SELECT COUNT(*) FROM note_presence WHERE note_id = $1", noteID).Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, 1, count)
}


func TestOfflineEditingNoConflict(t *testing.T) {
	setupAdmin(t)
	adminToken := getToken(t, "admin", "supersecret")

	dbConn := connectDB(t)
	defer dbConn.Close()
	_, _ = dbConn.Exec("DELETE FROM users WHERE username = 'user4'")

	// Create second user
	client := &http.Client{}
	userBody := map[string]interface{}{"username": "user4", "password": "pass4", "is_admin": false}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(userBody)
	req, _ := http.NewRequest("POST", baseURL+"/users/", buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	user4Token := getToken(t, "user4", "pass4")
	user4ID := getUserID(t, adminToken, "user4")

	// Create workspace and share with user4
	wsID := createWorkspace(t, adminToken, "OfflineWS")
	addReq := map[string]interface{}{"user_id": user4ID, "role": "member"}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(addReq)
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/members", baseURL, wsID), buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)

	// Create note with initial content
	noteID := createNote(t, adminToken, wsID, "Offline Note", "Initial content here.", nil, nil)

	// Get note to capture version
	note := getNote(t, adminToken, wsID, noteID)
// Try both possible keys for updated_at
var lastKnownVersion string
if v, ok := note["updated_at"].(string); ok {
	lastKnownVersion = v
} else if v, ok := note["Updated_at"].(string); ok {
	lastKnownVersion = v
} else if v, ok := note["UpdatedAt"].(string); ok {
	lastKnownVersion = v
} else {
	t.Fatal("Could not find updated_at timestamp in note response")
}

// Admin edits position 100 (far from user4's edit)
event := map[string]interface{}{"op_type": "insert", "position": 21, "text": " Admin edit."}
buf = new(bytes.Buffer)
json.NewEncoder(buf).Encode(event)
req, _ = http.NewRequest("POST",
	fmt.Sprintf("%s/workspaces/%d/notes/%d/events", baseURL, wsID, noteID), buf)
req.Header.Set("Authorization", "Bearer "+adminToken)
resp, _ = client.Do(req)
if resp.StatusCode != 200 {
	var errBody map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&errBody)
	t.Logf("Events endpoint error: %+v", errBody)
}
assert.Equal(t, 200, resp.StatusCode)


	// user4 "goes offline" and edits position 0-10 (different area)
	syncReq := map[string]interface{}{
		"last_known_version": lastKnownVersion,
		"operations": []map[string]interface{}{
			{
				"op_type":   "replace",
				"position":  0,
				"length":    7,
				"text":      "Updated",
				"timestamp": time.Now().Format(time.RFC3339),
			},
		},
	}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(syncReq)
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/sync", baseURL, wsID, noteID), buf)
	req.Header.Set("Authorization", "Bearer "+user4Token)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var syncResult map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&syncResult)
	assert.Equal(t, true, syncResult["success"])
	assert.Equal(t, false, syncResult["conflict"]) // No conflict - different areas

	// Verify final content
	note = getNote(t, adminToken, wsID, noteID)
	content := getStringField(note, "content", "Content")
	assert.Contains(t, content, "Updated") // user4's change
	assert.Contains(t, content, "Admin edit.") // admin's change
}

func TestOfflineEditingWithConflict(t *testing.T) {
	setupAdmin(t)
	adminToken := getToken(t, "admin", "supersecret")

	dbConn := connectDB(t)
	defer dbConn.Close()
	_, _ = dbConn.Exec("DELETE FROM users WHERE username = 'user5'")

	// Create second user
	client := &http.Client{}
	userBody := map[string]interface{}{"username": "user5", "password": "pass5", "is_admin": false}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(userBody)
	req, _ := http.NewRequest("POST", baseURL+"/users/", buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, err := client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	user5Token := getToken(t, "user5", "pass5")
	user5ID := getUserID(t, adminToken, "user5")

	// Create workspace and share with user5
	wsID := createWorkspace(t, adminToken, "ConflictWS")
	addReq := map[string]interface{}{"user_id": user5ID, "role": "member"}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(addReq)
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/workspaces/%d/members", baseURL, wsID), buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)

	// Create note
	noteID := createNote(t, adminToken, wsID, "Conflict Note", "Hello world test", nil, nil)

	// Capture version before conflict
	note := getNote(t, adminToken, wsID, noteID)
// Try both possible keys for updated_at
var lastKnownVersion string
if v, ok := note["updated_at"].(string); ok {
	lastKnownVersion = v
} else if v, ok := note["Updated_at"].(string); ok {
	lastKnownVersion = v
} else if v, ok := note["UpdatedAt"].(string); ok {
	lastKnownVersion = v
} else {
	t.Fatal("Could not find updated_at timestamp in note response")
}

	// Admin edits chars 0-5 (overlapping area)
	event := map[string]interface{}{"op_type": "replace", "position": 0, "length": 5, "text": "Goodbye"}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(event)
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/events", baseURL, wsID, noteID), buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	resp, _ = client.Do(req)
	assert.Equal(t, 200, resp.StatusCode)

	// user5 tries to sync edit at chars 3-8 (OVERLAPS with admin's 0-5)
	syncReq := map[string]interface{}{
		"last_known_version": lastKnownVersion,
		"operations": []map[string]interface{}{
			{
				"op_type":   "replace",
				"position":  3,
				"length":    5,
				"text":      "CONFLICT",
				"timestamp": time.Now().Format(time.RFC3339),
			},
		},
	}
	buf = new(bytes.Buffer)
	json.NewEncoder(buf).Encode(syncReq)
	req, _ = http.NewRequest("POST",
		fmt.Sprintf("%s/workspaces/%d/notes/%d/sync", baseURL, wsID, noteID), buf)
	req.Header.Set("Authorization", "Bearer "+user5Token)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var syncResult map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&syncResult)
	assert.Equal(t, true, syncResult["success"])
	assert.Equal(t, true, syncResult["conflict"]) // Conflict detected

	// Verify conflict section was appended
	note = getNote(t, adminToken, wsID, noteID)
	content := getStringField(note, "content", "Content")
	assert.Contains(t, content, "🔄 Your Offline Changes") // Conflict marker
	assert.Contains(t, content, "Your offline version:") // Conflict section
	assert.Contains(t, content, "Goodbye") // Server version preserved
}


func TestDefaultWorkspaceCreation(t *testing.T) {
	setupAdmin(t)
	adminToken := getToken(t, "admin", "supersecret")

	dbConn := connectDB(t)
	defer dbConn.Close()
	_, _ = dbConn.Exec("DELETE FROM users WHERE username = 'testdefault'")

	// Create a new user
	client := &http.Client{}
	userBody := map[string]interface{}{"username": "testdefault", "password": "pass123", "is_admin": false}
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(userBody)
	req, _ := http.NewRequest("POST", baseURL+"/users/", buf)
	req.Header.Set("Authorization", "Bearer "+adminToken)
resp, err := client.Do(req)
assert.NoError(t, err)
if resp.StatusCode != 201 {
    bodyBytes, _ := io.ReadAll(resp.Body)
    t.Logf("User creation failed with status %d: %s", resp.StatusCode, string(bodyBytes))
}
assert.Equal(t, 201, resp.StatusCode)

	// Login as new user
	newUserToken := getToken(t, "testdefault", "pass123")

	// List workspaces - should have exactly 1 default workspace
	req, _ = http.NewRequest("GET", baseURL+"/workspaces", nil)
	req.Header.Set("Authorization", "Bearer "+newUserToken)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var workspaces []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&workspaces)
	t.Logf("Workspaces response: %+v", workspaces)
	assert.Equal(t, 1, len(workspaces), "New user should have exactly 1 default workspace")
	assert.Contains(t, workspaces[0]["Name"], "testdefault's Workspace")

	wsID := int(workspaces[0]["ID"].(float64))

	// List notes in default workspace - should have 1 guide note
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/workspaces/%d/notes", baseURL, wsID), nil)
	req.Header.Set("Authorization", "Bearer "+newUserToken)
	resp, err = client.Do(req)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var notes []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&notes)
	assert.Equal(t, 1, len(notes), "Default workspace should have exactly 1 guide note")

	noteTitle := getStringField(notes[0], "title", "Title")
	assert.Equal(t, "Intro & Guide", noteTitle)

	noteContent := getStringField(notes[0], "content", "Content")
	assert.Contains(t, noteContent, "Welcome to go-notes!")
	assert.Contains(t, noteContent, "Markdown Formatting")
	
	// Verify note color is white by default
	noteColor := getStringField(notes[0], "color", "Color")
	assert.Equal(t, "#FFFFFF", noteColor)
}


// ---------------------
// DB Helper
// ---------------------

func connectDB(t *testing.T) *sql.DB {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "notes"
	}
	pass := os.Getenv("DB_PASSWORD")
	if pass == "" {
		pass = "notespass"
	}
	name := os.Getenv("DB_NAME")
	if name == "" {
		name = "notesdb"
	}

	makeURL := func(h string) string {
		return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, h, port, name)
	}

	conn, err := sql.Open("postgres", makeURL(host))
	if err == nil && conn.Ping() == nil {
		return conn
	}

	conn2, err2 := sql.Open("postgres", makeURL("db"))
	if err2 == nil && conn2.Ping() == nil {
		return conn2
	}

	t.Fatalf("Failed DB connection. host='%s' err=%v; fallback 'db' err=%v", host, err, err2)
	return nil
}
