package db

import (
    "database/sql"
    "fmt"
    "os"
    "strconv"
    "bytes"
    "encoding/json"
    "log"
    "net/http"
    _ "github.com/lib/pq"
)

// --- DB Connection ---
func Connect() (*sql.DB, error) {
    dbHost := getenv("DB_HOST", "db")
    dbPort := getenv("DB_PORT", "5432")
    dbUser := getenv("DB_USER", "notes")
    dbPassword := getenv("DB_PASSWORD", "notespass")
    dbName := getenv("DB_NAME", "notesdb")
    dbURL := fmt.Sprintf(
        "postgres://%s:%s@%s:%s/%s?sslmode=disable",
        dbUser, dbPassword, dbHost, dbPort, dbName,
    )
    return sql.Open("postgres", dbURL)
}

func getenv(key, def string) string {
    val := def
    if v := env(key); v != "" {
        val = v
    }
    return val
}

var env = func(key string) string {
    return os.Getenv(key)
}

// --- User CRUD ---

type User struct {
    ID           int    `json:"id"`
    Username     string `json:"username"`
    PasswordHash string `json:"password_hash"`
    IsAdmin      bool   `json:"is_admin"`
    CreatedAt    string `json:"created_at"`
}

func GetUserCount(db *sql.DB) (int, error) {
    var count int
    err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
    return count, err
}

func CreateAdmin(db *sql.DB, username, passwordHash string) error {
    var userID int
    err := db.QueryRow(
        "INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, TRUE) RETURNING id",
        username, passwordHash,
    ).Scan(&userID)
    if err != nil {
        return err
    }
    return CreateDefaultWorkspaceForUser(db, userID, username)
}

func GetUserByID(db *sql.DB, id int) (*User, error) {
    var u User
    err := db.QueryRow("SELECT id, username, password_hash, is_admin, created_at FROM users WHERE id = $1", id).
        Scan(&u.ID, &u.Username, &u.PasswordHash, &u.IsAdmin, &u.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &u, nil
}

func GetUserByUsername(db *sql.DB, username string) (*User, error) {
    var u User
    err := db.QueryRow("SELECT id, username, password_hash, is_admin, created_at FROM users WHERE username = $1", username).
        Scan(&u.ID, &u.Username, &u.PasswordHash, &u.IsAdmin, &u.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &u, nil
}

func ListUsers(db *sql.DB) ([]User, error) {
    rows, err := db.Query("SELECT id, username, is_admin, created_at FROM users ORDER BY id")
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var users []User
    for rows.Next() {
        var u User
        err := rows.Scan(&u.ID, &u.Username, &u.IsAdmin, &u.CreatedAt)
        if err == nil {
            users = append(users, u)
        }
    }
    return users, nil
}

func CreateUser(db *sql.DB, username, passwordHash string, isAdmin bool) error {
    var userID int
    err := db.QueryRow("INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id", username, passwordHash, isAdmin).Scan(&userID)
    if err != nil {
        return err
    }
    return CreateDefaultWorkspaceForUser(db, userID, username)
}


func CreateDefaultWorkspaceForUser(db *sql.DB, userID int, username string) error {
    // Create default workspace
    workspaceName := "Default WS"
    var wsID int
    err := db.QueryRow("INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id", workspaceName, userID).Scan(&wsID)
    if err != nil {
        return err
    }
    
    // Add user as owner member
    _, err = db.Exec("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')", wsID, userID)
    if err != nil {
        return err
    }
    
    // Create intro note
    noteID, err := CreateNote(db, wsID, "Intro & Guide", nil, &userID, "#FFFFFF")
    if err != nil {
        return err
    }
    
    // Initialize note content via Hocuspocus HTTP endpoint
    yjsURL := getenv("YJS_HTTP_URL", "http://yjs:1235")
    roomID := fmt.Sprintf("w%d_n%d", wsID, noteID)
    
    payload := map[string]string{"room_id": roomID}
    jsonData, err := json.Marshal(payload)
    if err != nil {
        log.Printf("[WARN] Failed to marshal room_id for initialization: %v", err)
        return nil // Don't fail user creation if initialization fails
    }
    
    resp, err := http.Post(
        fmt.Sprintf("%s/initialize-document", yjsURL),
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        log.Printf("[WARN] Failed to initialize default note content: %v", err)
        return nil // Don't fail user creation if initialization fails
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != 200 {
        log.Printf("[WARN] Hocuspocus returned status %d when initializing note", resp.StatusCode)
    } else {
        log.Printf("[INFO] Successfully initialized default intro note for user %d", userID)
    }
    
    return nil
}


func UpdateUser(db *sql.DB, id int, username, passwordHash string) error {
    _, err := db.Exec("UPDATE users SET username=$1, password_hash=$2 WHERE id=$3", username, passwordHash, id)
    return err
}

func DeleteUser(db *sql.DB, id int) error {
    _, err := db.Exec("DELETE FROM users WHERE id=$1", id)
    return err
}

// --- Workspace CRUD ---

type Workspace struct {
    ID        int    `json:"id"`
    Name      string `json:"name"`
    OwnerID   int    `json:"owner_id"`
    CreatedAt string `json:"created_at"`
}

type WorkspaceMember struct {
    WorkspaceID int    `json:"workspace_id"`
    UserID      int    `json:"user_id"`
    Role        string `json:"role"` // "owner" or "member"
}

func CreateWorkspace(db *sql.DB, name string, ownerID int) (int, error) {
    var id int
    err := db.QueryRow("INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id", name, ownerID).Scan(&id)
    if err != nil {
        return 0, err
    }
    // Add owner as workspace member
    _, err = db.Exec("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')", id, ownerID)
    if err != nil {
        return id, err
    }
    return id, nil
}

func ListWorkspaces(db *sql.DB, userID int) ([]Workspace, error) {
    rows, err := db.Query(`
        SELECT w.id, w.name, w.owner_id, w.created_at
        FROM workspaces w
        JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE wm.user_id = $1
        ORDER BY w.id
    `, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var workspaces []Workspace
    for rows.Next() {
        var w Workspace
        err := rows.Scan(&w.ID, &w.Name, &w.OwnerID, &w.CreatedAt)
        if err == nil {
            workspaces = append(workspaces, w)
        }
    }
    return workspaces, nil
}

func GetWorkspace(db *sql.DB, id int) (*Workspace, error) {
    var w Workspace
    err := db.QueryRow("SELECT id, name, owner_id, created_at FROM workspaces WHERE id = $1", id).
        Scan(&w.ID, &w.Name, &w.OwnerID, &w.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &w, nil
}

func UpdateWorkspace(db *sql.DB, id int, name string) error {
    _, err := db.Exec("UPDATE workspaces SET name=$1 WHERE id=$2", name, id)
    return err
}

func DeleteWorkspace(db *sql.DB, id int) error {
    _, err := db.Exec("DELETE FROM workspaces WHERE id=$1", id)
    return err
}

func ListWorkspaceMembers(db *sql.DB, workspaceID int) ([]WorkspaceMember, error) {
    rows, err := db.Query("SELECT workspace_id, user_id, role FROM workspace_members WHERE workspace_id = $1", workspaceID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var members []WorkspaceMember
    for rows.Next() {
        var wm WorkspaceMember
        err := rows.Scan(&wm.WorkspaceID, &wm.UserID, &wm.Role)
        if err == nil {
            members = append(members, wm)
        }
    }
    return members, nil
}

func AddWorkspaceMember(db *sql.DB, workspaceID, userID int, role string) error {
    _, err := db.Exec("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", workspaceID, userID, role)
    return err
}

func RemoveWorkspaceMember(db *sql.DB, workspaceID, userID int) error {
    _, err := db.Exec("DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", workspaceID, userID)
    return err
}

func TransferWorkspaceOwnership(db *sql.DB, workspaceID, newOwnerID int) error {
    _, err := db.Exec("UPDATE workspaces SET owner_id=$1 WHERE id=$2", newOwnerID, workspaceID)
    if err != nil {
        return err
    }
    _, err = db.Exec("UPDATE workspace_members SET role='owner' WHERE workspace_id=$1 AND user_id=$2", workspaceID, newOwnerID)
    if err != nil {
        return err
    }
    _, err = db.Exec("UPDATE workspace_members SET role='member' WHERE workspace_id=$1 AND user_id!=$2 AND role='owner'", workspaceID, newOwnerID)
    return err
}

func IsWorkspaceOwner(db *sql.DB, workspaceID, userID int) (bool, error) {
    var count int
    err := db.QueryRow("SELECT COUNT(*) FROM workspaces WHERE id=$1 AND owner_id=$2", workspaceID, userID).Scan(&count)
    return count > 0, err
}

func IsWorkspaceMember(db *sql.DB, workspaceID, userID int) (bool, error) {
    var count int
    err := db.QueryRow("SELECT COUNT(*) FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", workspaceID, userID).Scan(&count)
    return count > 0, err
}

// --- Note, Folder CRUD ---

type Note struct {
    ID          int        `json:"id"`
    WorkspaceID int        `json:"workspace_id"`
    Title       string     `json:"title"`
    YjsRoomID   string     `json:"yjs_room_id"`
    FolderID    *int       `json:"folder_id"`
    CreatedBy   *int       `json:"created_by"`
    CreatedAt   string     `json:"created_at"`
    UpdatedAt   string     `json:"updated_at"`
    IsTrashed   bool       `json:"is_trashed"`
    TrashedAt   *string    `json:"trashed_at"`
    Color       string     `json:"color"`
    Tags        []Tag      `json:"tags,omitempty"`
}

type Folder struct {
    ID          int    `json:"id"`
    WorkspaceID int    `json:"workspace_id"`
    ParentID    *int   `json:"parent_id"`
    Name        string `json:"name"`
    CreatedAt   string `json:"created_at"`
}

func CreateNote(db *sql.DB, workspaceID int, title string, folderID *int, createdBy *int, color string) (int, error) {
    if color == "" {
        color = "#FFFFFF"
    }
    if title == "" {
        title = "Untitled"
    }
    
    var id int
    err := db.QueryRow(
        "INSERT INTO notes (workspace_id, title, yjs_room_id, folder_id, created_by, color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        workspaceID, title, "temp", folderID, createdBy, color,
    ).Scan(&id)
    if err != nil {
        return 0, err
    }
    
    // Update with proper room ID
    yjsRoomID := fmt.Sprintf("w%d_n%d", workspaceID, id)
    _, err = db.Exec("UPDATE notes SET yjs_room_id=$1 WHERE id=$2", yjsRoomID, id)
    return id, err
}

func GetNote(db *sql.DB, id int) (*Note, error) {
    var n Note
    err := db.QueryRow("SELECT id, workspace_id, title, yjs_room_id, folder_id, created_by, created_at, updated_at, is_trashed, trashed_at, color FROM notes WHERE id = $1", id).
        Scan(&n.ID, &n.WorkspaceID, &n.Title, &n.YjsRoomID, &n.FolderID, &n.CreatedBy, &n.CreatedAt, &n.UpdatedAt, &n.IsTrashed, &n.TrashedAt, &n.Color)
    if err != nil {
        return nil, err
    }
    return &n, nil
}

func ListNotes(db *sql.DB, workspaceID int, folderID *int, includeTrashed bool) ([]Note, error) {
    query := "SELECT id FROM notes WHERE workspace_id = $1"
    args := []interface{}{workspaceID}
    argIdx := 2
    if folderID != nil {
        query += fmt.Sprintf(" AND folder_id = $%d", argIdx)
        args = append(args, *folderID)
        argIdx++
    }
    if !includeTrashed {
        query += fmt.Sprintf(" AND is_trashed = FALSE")
    }
    rows, err := db.Query(query, args...)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var notes []Note
    for rows.Next() {
        var id int
        err := rows.Scan(&id)
        if err == nil {
            note, _ := GetNote(db, id)
            if note != nil {
                notes = append(notes, *note)
            }
        }
    }
    return notes, nil
}

// --- Trash/Restore/Empty Functions ---

func TrashNote(db *sql.DB, id int) error {
    _, err := db.Exec("UPDATE notes SET is_trashed=TRUE, trashed_at=NOW() WHERE id=$1", id)
    return err
}

func RestoreNote(db *sql.DB, id int) error {
    _, err := db.Exec("UPDATE notes SET is_trashed=FALSE, trashed_at=NULL WHERE id=$1", id)
    return err
}

func DeleteNote(db *sql.DB, id int) error {
    _, err := db.Exec("DELETE FROM notes WHERE id=$1", id)
    return err
}

func ListTrashedNotes(db *sql.DB, workspaceID int) ([]Note, error) {
    rows, err := db.Query("SELECT id FROM notes WHERE workspace_id = $1 AND is_trashed = TRUE", workspaceID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var notes []Note
    for rows.Next() {
        var id int
        err := rows.Scan(&id)
        if err == nil {
            note, _ := GetNote(db, id)
            if note != nil {
                notes = append(notes, *note)
            }
        }
    }
    return notes, nil
}

func EmptyWorkspaceTrash(db *sql.DB, workspaceID int) error {
    _, err := db.Exec("DELETE FROM notes WHERE workspace_id=$1 AND is_trashed=TRUE", workspaceID)
    return err
}

func AutoEmptyTrash(db *sql.DB) error {
    daysStr := getenv("TRASH_AUTO_DELETE_DAYS", "30")
    days := 30
    if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
        days = d
    }
    _, err := db.Exec(fmt.Sprintf("DELETE FROM notes WHERE is_trashed=TRUE AND trashed_at < (NOW() - INTERVAL '%d days')", days))
    return err
}

// --- Folder CRUD ---

func CreateFolder(db *sql.DB, workspaceID int, name string, parentID *int) (int, error) {
    var id int
    err := db.QueryRow(
        "INSERT INTO folders (workspace_id, name, parent_id) VALUES ($1, $2, $3) RETURNING id",
        workspaceID, name, parentID,
    ).Scan(&id)
    return id, err
}

func GetFolder(db *sql.DB, id int) (*Folder, error) {
    var f Folder
    err := db.QueryRow("SELECT id, workspace_id, parent_id, name, created_at FROM folders WHERE id = $1", id).
        Scan(&f.ID, &f.WorkspaceID, &f.ParentID, &f.Name, &f.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &f, nil
}

func ListFolders(db *sql.DB, workspaceID int) ([]Folder, error) {
    rows, err := db.Query("SELECT id FROM folders WHERE workspace_id = $1", workspaceID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var folders []Folder
    for rows.Next() {
        var id int
        err := rows.Scan(&id)
        if err == nil {
            folder, _ := GetFolder(db, id)
            if folder != nil {
                folders = append(folders, *folder)
            }
        }
    }
    return folders, nil
}

func UpdateFolder(db *sql.DB, id int, name string, parentID *int) error {
    _, err := db.Exec("UPDATE folders SET name=$1, parent_id=$2 WHERE id=$3", name, parentID, id)
    return err
}

func DeleteFolder(db *sql.DB, id int) error {
    // First, get the parent_id of the folder being deleted
    var parentID *int
    err := db.QueryRow("SELECT parent_id FROM folders WHERE id=$1", id).Scan(&parentID)
    if err != nil {
        return err
    }
    
    // Get all child folder IDs recursively
    folderIDs := []int{id}
    err = collectChildFolderIDs(db, id, &folderIDs)
    if err != nil {
        return err
    }
    
    // Move ALL notes (trashed and non-trashed) in these folders to trash and set folder_id to parent
    if len(folderIDs) > 0 {
        for _, folderID := range folderIDs {
            // Trash all non-trashed notes in this folder
            _, err = db.Exec("UPDATE notes SET is_trashed=TRUE, trashed_at=NOW(), folder_id=$1 WHERE is_trashed=FALSE AND folder_id=$2", parentID, folderID)
            if err != nil {
                return err
            }
            
            // Move already-trashed notes to parent folder
            _, err = db.Exec("UPDATE notes SET folder_id=$1 WHERE is_trashed=TRUE AND folder_id=$2", parentID, folderID)
            if err != nil {
                return err
            }
        }
    }
    
    // Now delete the folder (CASCADE will only delete child folders, notes are already moved)
    _, err = db.Exec("DELETE FROM folders WHERE id=$1", id)
    return err
}

// Helper function to recursively collect all child folder IDs
func collectChildFolderIDs(db *sql.DB, parentID int, folderIDs *[]int) error {
    rows, err := db.Query("SELECT id FROM folders WHERE parent_id=$1", parentID)
    if err != nil {
        return err
    }
    defer rows.Close()
    
    var childIDs []int
    for rows.Next() {
        var childID int
        if err := rows.Scan(&childID); err == nil {
            childIDs = append(childIDs, childID)
            *folderIDs = append(*folderIDs, childID)
        }
    }
    
    // Recursively collect children of children
    for _, childID := range childIDs {
        if err := collectChildFolderIDs(db, childID, folderIDs); err != nil {
            return err
        }
    }
    
    return nil
}

// --- Tag Logic ---

type Tag struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func GetOrCreateTag(db *sql.DB, name string) (Tag, error) {
    var t Tag
    err := db.QueryRow("SELECT id, name FROM tags WHERE LOWER(name)=LOWER($1)", name).Scan(&t.ID, &t.Name)
    if err == nil {
        return t, nil
    }
    err = db.QueryRow("INSERT INTO tags (name) VALUES ($1) RETURNING id, name", name).Scan(&t.ID, &t.Name)
    if err != nil {
        err2 := db.QueryRow("SELECT id, name FROM tags WHERE LOWER(name)=LOWER($1)", name).Scan(&t.ID, &t.Name)
        if err2 == nil {
            return t, nil
        }
        return t, err
    }
    return t, nil
}

func ListTags(db *sql.DB) ([]Tag, error) {
    rows, err := db.Query("SELECT id, name FROM tags ORDER BY LOWER(name)")
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var tags []Tag
    for rows.Next() {
        var t Tag
        if err := rows.Scan(&t.ID, &t.Name); err == nil {
            tags = append(tags, t)
        }
    }
    return tags, nil
}

func SetTagsForNote(db *sql.DB, noteID int, tagNames []string) error {
    _, err := db.Exec("DELETE FROM note_tags WHERE note_id = $1", noteID)
    if err != nil {
        return err
    }
    for _, name := range tagNames {
        t, err := GetOrCreateTag(db, name)
        if err != nil {
            return fmt.Errorf("GetOrCreateTag failed for tag '%s': %v", name, err)
        }
        _, err = db.Exec("INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", noteID, t.ID)
        if err != nil {
            return fmt.Errorf("Failed to insert note_tag for note %d tag %d: %v", noteID, t.ID, err)
        }
    }
    return nil
}

func ListTagsForNote(db *sql.DB, noteID int) ([]Tag, error) {
    rows, err := db.Query(`
        SELECT t.id, t.name
        FROM tags t
        JOIN note_tags nt ON nt.tag_id = t.id
        WHERE nt.note_id = $1
        ORDER BY LOWER(t.name)
    `, noteID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var tags []Tag
    for rows.Next() {
        var t Tag
        if err := rows.Scan(&t.ID, &t.Name); err == nil {
            tags = append(tags, t)
        }
    }
    return tags, nil
}

func ListTagsForWorkspace(db *sql.DB, workspaceID int) ([]Tag, error) {
    rows, err := db.Query(`
        SELECT t.id, t.name
        FROM tags t
        JOIN note_tags nt ON nt.tag_id = t.id
        JOIN notes n ON n.id = nt.note_id
        WHERE n.workspace_id = $1
        GROUP BY t.id, t.name
        ORDER BY LOWER(t.name)
    `, workspaceID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var tags []Tag
    for rows.Next() {
        var t Tag
        if err := rows.Scan(&t.ID, &t.Name); err == nil {
            tags = append(tags, t)
        }
    }
    return tags, nil
}

// --- Move/Update Functions for Notes and Folders ---

// UpdateNoteMetadata updates note metadata fields (NOT content - preserves granular edit system)
func UpdateNoteMetadata(db *sql.DB, noteID int, updates map[string]interface{}) error {
	// Build dynamic UPDATE query for allowed metadata fields only
	allowedFields := map[string]bool{
		"title":        true,
		"folder_id":    true,
		"workspace_id": true,
		"color":        true,
	}
	
	query := "UPDATE notes SET updated_at=CURRENT_TIMESTAMP"
	args := []interface{}{}
	argIdx := 1
	
	for field, value := range updates {
		if !allowedFields[field] {
			continue // Skip disallowed fields (like content)
		}
		query += fmt.Sprintf(", %s=$%d", field, argIdx)
		args = append(args, value)
		argIdx++
	}
	
	query += fmt.Sprintf(" WHERE id=$%d", argIdx)
	args = append(args, noteID)
	
	_, err := db.Exec(query, args...)
	return err
}

// IsDescendantFolder checks if potentialParentID is a descendant of folderID
// Returns true if moving folderID to potentialParentID would create a cycle
func IsDescendantFolder(db *sql.DB, folderID int, potentialParentID int) (bool, error) {
	if folderID == potentialParentID {
		return true, nil // Folder is its own descendant
	}
	
	// Walk up the tree from potentialParentID to see if we hit folderID
	currentID := potentialParentID
	visited := make(map[int]bool)
	
	for currentID != 0 {
		if visited[currentID] {
			// Cycle detected in existing tree - shouldn't happen but handle it
			return false, fmt.Errorf("cycle detected in folder tree")
		}
		visited[currentID] = true
		
		if currentID == folderID {
			return true, nil // Found folderID in parent chain
		}
		
		// Get parent of current folder
		var parentID *int
		err := db.QueryRow("SELECT parent_id FROM folders WHERE id=$1", currentID).Scan(&parentID)
		if err != nil {
			if err == sql.ErrNoRows {
				break // Reached root
			}
			return false, err
		}
		
		if parentID == nil {
			break // Reached root
		}
		currentID = *parentID
	}
	
	return false, nil
}

// UpdateFolderWithCascade updates folder and cascades workspace_id changes to children and notes
func UpdateFolderWithCascade(db *sql.DB, folderID int, name string, parentID *int, workspaceID *int) error {
	// Get current folder state
	oldFolder, err := GetFolder(db, folderID)
	if err != nil {
		return err
	}
	
	// If parentID is changing, validate it won't create a cycle
	if parentID != nil && (oldFolder.ParentID == nil || *parentID != *oldFolder.ParentID) {
		isDescendant, err := IsDescendantFolder(db, folderID, *parentID)
		if err != nil {
			return err
		}
		if isDescendant {
			return fmt.Errorf("cannot move folder into itself or its descendants")
		}
		
		// If moving to a different parent, verify parent is in target workspace
		if workspaceID != nil && *workspaceID != oldFolder.WorkspaceID {
			parentFolder, err := GetFolder(db, *parentID)
			if err != nil {
				return fmt.Errorf("parent folder not found")
			}
			if parentFolder.WorkspaceID != *workspaceID {
				return fmt.Errorf("parent folder must be in target workspace")
			}
		}
	}
	
	// Update the folder itself
	_, err = db.Exec(
		"UPDATE folders SET name=$1, parent_id=$2, workspace_id=$3 WHERE id=$4",
		name, parentID, coalesce(workspaceID, &oldFolder.WorkspaceID), folderID,
	)
	if err != nil {
		return err
	}
	
	// If workspace_id changed, cascade to all descendants
	if workspaceID != nil && *workspaceID != oldFolder.WorkspaceID {
		if err := cascadeWorkspaceIDToDescendants(db, folderID, *workspaceID); err != nil {
			return err
		}
	}
	
	return nil
}

// Helper function to return first non-nil pointer value
func coalesce(values ...*int) int {
	for _, v := range values {
		if v != nil {
			return *v
		}
	}
	return 0
}

// cascadeWorkspaceIDToDescendants recursively updates workspace_id for all child folders and notes
func cascadeWorkspaceIDToDescendants(db *sql.DB, parentFolderID int, newWorkspaceID int) error {
	// Get all child folders
	rows, err := db.Query("SELECT id FROM folders WHERE parent_id=$1", parentFolderID)
	if err != nil {
		return err
	}
	defer rows.Close()
	
	var childFolderIDs []int
	for rows.Next() {
		var childID int
		if err := rows.Scan(&childID); err == nil {
			childFolderIDs = append(childFolderIDs, childID)
		}
	}
	
	// Update all child folders' workspace_id
	for _, childID := range childFolderIDs {
		_, err := db.Exec("UPDATE folders SET workspace_id=$1 WHERE id=$2", newWorkspaceID, childID)
		if err != nil {
			return err
		}
		
		// Recursively update this child's descendants
		if err := cascadeWorkspaceIDToDescendants(db, childID, newWorkspaceID); err != nil {
			return err
		}
	}
	
	// Update all notes in this folder
	_, err = db.Exec("UPDATE notes SET workspace_id=$1 WHERE folder_id=$2", newWorkspaceID, parentFolderID)
	if err != nil {
		return err
	}
	
	return nil
}
