// backend/cmd/main.go
package main

import (
    "fmt"
    "log"
    "os"
    "net/http"
    "sync"
    "strconv"
    "github.com/gin-gonic/gin"
    "go-notes/backend/internal/db"
    "go-notes/backend/internal/auth"
    "golang.org/x/crypto/bcrypt"
    "strings"
    "time"
    "net/http/httputil"
    "net/url"
)

func atoi(s string) int {
	var x int
	fmt.Sscanf(s, "%d", &x)
	return x
}

func getenvInt(key string, def int) int {
    val := os.Getenv(key)
    if val == "" {
        return def
    }
    i, err := strconv.Atoi(val)
    if err != nil {
        return def
    }
    return i
}

func main() {
    if err := db.RunMigrations(); err != nil {
        log.Fatalf("DB migration failed: %v", err)
    }
    database, err := db.Connect()
    if err != nil {
        log.Fatalf("Database connection failed: %v", err)
    }
    defer database.Close()

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    basePath := os.Getenv("API_BASE_PATH")
    if basePath == "" {
        basePath = "/"
    }

    // --- Trash Auto-Empty on Startup ---
    if err := db.AutoEmptyTrash(database); err != nil {
        log.Printf("[WARN] AutoEmptyTrash on startup failed: %v", err)
    }

    // Optionally: Periodic auto-empty (for long-running servers)
    go func() {
        ticker := time.NewTicker(time.Hour)
        for range ticker.C {
            if err := db.AutoEmptyTrash(database); err != nil {
                log.Printf("[WARN] AutoEmptyTrash periodic failed: %v", err)
            }
        }
    }()

    r := gin.Default()
    api := r.Group(basePath)


    api.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    var mu sync.Mutex
    adminExists := false
    userCount, err := db.GetUserCount(database)
    if err == nil && userCount > 0 {
        adminExists = true
    }

	// Check if setup is complete
    api.GET("/setup", func(c *gin.Context) {
        mu.Lock()
        defer mu.Unlock()
        c.JSON(http.StatusOK, gin.H{"completed": adminExists})
    })

    api.POST("/setup", func(c *gin.Context) {
        mu.Lock()
        defer mu.Unlock()
        if adminExists {
            c.JSON(http.StatusForbidden, gin.H{"error": "Setup endpoint disabled after admin creation"})
            return
        }
        var req struct {
            Username string `json:"username"`
            Password string `json:"password"`
        }
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        if req.Username == "" || req.Password == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password required"})
            return
        }
        passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Password hashing failed"})
            return
        }
        if err := db.CreateAdmin(database, req.Username, string(passwordHash)); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Admin creation failed"})
            return
        }
        adminExists = true
        c.JSON(http.StatusOK, gin.H{"message": "Admin user created"})
    })

    // --- Authentication/Login ---
    api.POST("/login", func(c *gin.Context) {
        var req struct {
            Username string `json:"username"`
            Password string `json:"password"`
        }
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        user, err := db.GetUserByUsername(database, req.Username)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
            return
        }
        if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
            return
        }
        token, err := auth.GenerateToken(user.ID, user.IsAdmin)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Token generation failed"})
            return
        }
        c.JSON(http.StatusOK, gin.H{
            "token": token,
            "user": gin.H{"id": user.ID, "username": user.Username, "is_admin": user.IsAdmin},
        })
    })

// --- Yjs Token Validation Endpoint ---
	api.POST("/validate-yjs-token", func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"valid": false, "error": "Missing or invalid authorization header"})
			return
		}
		
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		
		// Parse and validate JWT
		claims, err := auth.ParseToken(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"valid": false, "error": "Invalid or expired token"})
			return
		}
		
		// Verify user still exists in database
		_, err = db.GetUserByID(database, claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"valid": false, "error": "User not found"})
			return
		}
		
		// Parse request body
		var req struct {
			RoomID      string `json:"room_id"`
			WorkspaceID int    `json:"workspace_id"`
			NoteID      int    `json:"note_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"valid": false, "error": "Invalid request body"})
			return
		}
		
		// Verify workspace membership
		isMember, err := db.IsWorkspaceMember(database, req.WorkspaceID, claims.UserID)
		if err != nil || !isMember {
			c.JSON(http.StatusForbidden, gin.H{"valid": false, "error": "Not a workspace member"})
			return
		}
		
		// Token is valid and user has access
		c.JSON(http.StatusOK, gin.H{
			"valid":        true,
			"user_id":      claims.UserID,
			"workspace_id": req.WorkspaceID,
		})
	})

    // --- User CRUD & Access Control ---
    userGroup := api.Group("/users")
    userGroup.Use(auth.AuthRequired(database))

    userGroup.GET("/", func(c *gin.Context) {
        // Allow all authenticated users to list users (needed for workspace sharing)
        users, err := db.ListUsers(database)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list users"})
            return
        }
        c.JSON(http.StatusOK, users)
    })
    userGroup.POST("/", func(c *gin.Context) {
        isAdmin := c.GetBool("is_admin")
        if !isAdmin {
            c.JSON(http.StatusForbidden, gin.H{"error": "Admin only"})
            return
        }
        var req struct {
            Username string `json:"username"`
            Password string `json:"password"`
            IsAdmin  bool   `json:"is_admin"`
        }
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Password hashing failed"})
            return
        }
        err = db.CreateUser(database, req.Username, string(passwordHash), req.IsAdmin)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "User creation failed"})
            return
        }
        c.JSON(http.StatusCreated, gin.H{"message": "User created"})
    })
    userGroup.GET("/:id", func(c *gin.Context) {
        userID := c.GetInt("user_id")
        isAdmin := c.GetBool("is_admin")
        paramID := c.Param("id")
        id := 0
        fmt.Sscanf(paramID, "%d", &id)
        if !isAdmin && userID != id {
            c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
            return
        }
        user, err := db.GetUserByID(database, id)
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        c.JSON(http.StatusOK, user)
    })
    userGroup.PUT("/:id", func(c *gin.Context) {
        userID := c.GetInt("user_id")
        isAdmin := c.GetBool("is_admin")
        paramID := c.Param("id")
        id := 0
        fmt.Sscanf(paramID, "%d", &id)
        if !isAdmin && userID != id {
            c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
            return
        }
        var req struct {
            Username string `json:"username"`
            Password string `json:"password"`
        }
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Password hashing failed"})
            return
        }
        err = db.UpdateUser(database, id, req.Username, string(passwordHash))
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "User updated"})
    })
    userGroup.DELETE("/:id", func(c *gin.Context) {
        userID := c.GetInt("user_id")
        isAdmin := c.GetBool("is_admin")
        paramID := c.Param("id")
        id := 0
        fmt.Sscanf(paramID, "%d", &id)
        user, err := db.GetUserByID(database, id)
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        if isAdmin {
            if user.IsAdmin {
                c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete admin"})
                return
            }
            if userID == id {
                c.JSON(http.StatusForbidden, gin.H{"error": "Admin cannot delete self"})
                return
            }
        } else {
            if userID != id {
                c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
                return
            }
        }
        err = db.DeleteUser(database, id)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Delete failed"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
    })

    // --- Tags Global Endpoint ---
    api.GET("/tags", func(c *gin.Context) {
        tags, err := db.ListTags(database)
        if err != nil {
            c.JSON(500, gin.H{"error": "Failed to list tags"})
            return
        }
        c.JSON(200, tags)
    })

    // --- Workspace CRUD & Sharing ---
    workspaceGroup := api.Group("/workspaces")
    workspaceGroup.Use(auth.AuthRequired(database))
    workspaceGroup.POST("", func(c *gin.Context) {
        userID := c.GetInt("user_id")
        var req struct {
            Name string `json:"name"`
        }
        if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        id, err := db.CreateWorkspace(database, req.Name, userID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Workspace creation failed"})
            return
        }
        c.JSON(http.StatusCreated, gin.H{"id": id, "name": req.Name, "owner_id": userID})
    })
workspaceGroup.GET("", func(c *gin.Context) {
        userID := c.GetInt("user_id")
        workspaces, err := db.ListWorkspaces(database, userID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list workspaces"})
            return
        }
        
        // Add role to each workspace
        type WorkspaceWithRole struct {
            ID        int    `json:"id"`
            Name      string `json:"name"`
            OwnerID   int    `json:"owner_id"`
            CreatedAt string `json:"created_at"`
            Role      string `json:"role"`
        }
        
        var result []WorkspaceWithRole
        for _, ws := range workspaces {
            role := "member"
            if ws.OwnerID == userID {
                role = "owner"
            }
            result = append(result, WorkspaceWithRole{
                ID:        ws.ID,
                Name:      ws.Name,
                OwnerID:   ws.OwnerID,
                CreatedAt: ws.CreatedAt,
                Role:      role,
            })
        }
        
        c.JSON(http.StatusOK, result)
    })

workspaceGroup.PUT("/:id", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        
        isOwner, err := db.IsWorkspaceOwner(database, workspaceID, userID)
        if err != nil || !isOwner {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can update workspace"})
            return
        }
        
        var req struct {
            Name string `json:"name"`
        }
        if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        
        err = db.UpdateWorkspace(database, workspaceID, req.Name)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workspace"})
            return
        }
        
        c.JSON(http.StatusOK, gin.H{"message": "Workspace updated"})
    })
    
    workspaceGroup.DELETE("/:id", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        
        isOwner, err := db.IsWorkspaceOwner(database, workspaceID, userID)
        if err != nil || !isOwner {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can delete workspace"})
            return
        }
        
        err = db.DeleteWorkspace(database, workspaceID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workspace"})
            return
        }
        
        c.JSON(http.StatusOK, gin.H{"message": "Workspace deleted"})
    })

    workspaceGroup.GET("/:id/members", func(c *gin.Context) {
        userID := c.GetInt("user_id")
        id, _ := strconv.Atoi(c.Param("id"))
        isMember, err := db.IsWorkspaceMember(database, id, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        members, err := db.ListWorkspaceMembers(database, id)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list members"})
            return
        }
        c.JSON(http.StatusOK, members)
    })
    workspaceGroup.POST("/:id/members", func(c *gin.Context) {
        id, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        isOwner, err := db.IsWorkspaceOwner(database, id, userID)
        if err != nil || !isOwner {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can add members"})
            return
        }
        var req struct {
            UserID int    `json:"user_id"`
            Role   string `json:"role"` // "member" or "owner"
        }
        if err := c.ShouldBindJSON(&req); err != nil || req.UserID == 0 || (req.Role != "member" && req.Role != "owner") {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        err = db.AddWorkspaceMember(database, id, req.UserID, req.Role)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not add member"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "Member added"})
    })

workspaceGroup.DELETE("/:id/members/:user_id", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        memberUserID, _ := strconv.Atoi(c.Param("user_id"))
        currentUserID := c.GetInt("user_id")
        
        isOwner, err := db.IsWorkspaceOwner(database, workspaceID, currentUserID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Workspace lookup failed"})
            return
        }
        
        // Allow if: (1) user is removing themselves, OR (2) user is owner removing someone else
        isSelfRemoval := memberUserID == currentUserID
        
        if !isSelfRemoval && !isOwner {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can remove other members"})
            return
        }
        
        // Prevent owner from leaving their own workspace
        if isSelfRemoval && isOwner {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot leave workspace you own. Transfer ownership first."})
            return
        }
        
        err = db.RemoveWorkspaceMember(database, workspaceID, memberUserID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
            return
        }
        
        c.JSON(http.StatusOK, gin.H{"message": "Member removed"})
    })

    workspaceGroup.PUT("/:id/owner", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        isOwner, err := db.IsWorkspaceOwner(database, workspaceID, userID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Workspace lookup failed"})
            return
        }
        if !isOwner {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only the current owner can transfer ownership"})
            return
        }
        var req struct {
            NewOwnerID int `json:"new_owner_id"`
        }
        if err := c.ShouldBindJSON(&req); err != nil || req.NewOwnerID == 0 {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        isMember, err := db.IsWorkspaceMember(database, workspaceID, req.NewOwnerID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Workspace member lookup failed"})
            return
        }
        if !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "New owner must be an existing member"})
            return
        }
        if req.NewOwnerID == userID {
            c.JSON(http.StatusBadRequest, gin.H{"error": "You are already the owner"})
            return
        }
        if err := db.TransferWorkspaceOwnership(database, workspaceID, req.NewOwnerID); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Ownership transfer failed"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "Ownership transferred successfully", "new_owner_id": req.NewOwnerID})
    })



    workspaceGroup.GET("/:id/tags", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        tags, err := db.ListTagsForWorkspace(database, workspaceID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list tags"})
            return
        }
        c.JSON(http.StatusOK, tags)
    })

    // --- Trash Endpoints ---
    workspaceGroup.GET("/:id/trash", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        notes, err := db.ListTrashedNotes(database, workspaceID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list trashed notes"})
            return
        }
        c.JSON(http.StatusOK, notes)
    })

workspaceGroup.POST("/:id/trash/empty", func(c *gin.Context) {
    workspaceID, _ := strconv.Atoi(c.Param("id"))
    userID := c.GetInt("user_id")
    isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
    if err != nil || !isMember {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
        return
    }
    err = db.EmptyWorkspaceTrash(database, workspaceID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to empty trash"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Trash emptied"})
})

    workspaceGroup.POST("/:id/notes/:note_id/trash", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        noteID, _ := strconv.Atoi(c.Param("note_id"))
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        note, err := db.GetNote(database, noteID)
        if err != nil || note.WorkspaceID != workspaceID {
            c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
            return
        }
        err = db.TrashNote(database, noteID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to trash note"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "Note moved to trash"})
    })

    workspaceGroup.POST("/:id/notes/:note_id/restore", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        noteID, _ := strconv.Atoi(c.Param("note_id"))
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        note, err := db.GetNote(database, noteID)
        if err != nil || note.WorkspaceID != workspaceID {
            c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
            return
        }
        err = db.RestoreNote(database, noteID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore note"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "Note restored from trash"})
    })

    // --- Folder CRUD Endpoints ---
    folderGroup := workspaceGroup.Group("/:id/folders")
    folderGroup.POST("", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        var req struct {
            Name     string `json:"name"`
            ParentID *int   `json:"parent_id"`
        }
        if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }

folderID, err := db.CreateFolder(database, workspaceID, req.Name, req.ParentID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create folder"})
            return
        }
        
        // Return the complete folder object
        folder, err := db.GetFolder(database, folderID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Created folder but failed to retrieve"})
            return
        }
        c.JSON(http.StatusCreated, folder)
    })
    folderGroup.GET("", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        folders, err := db.ListFolders(database, workspaceID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list folders"})
            return
        }
        c.JSON(http.StatusOK, folders)
    })


folderGroup.PUT("/:folder_id", func(c *gin.Context) {
    folderID, _ := strconv.Atoi(c.Param("folder_id"))
    sourceWorkspaceID, _ := strconv.Atoi(c.Param("id"))
    userID := c.GetInt("user_id")
    
    // Verify user is member of source workspace
    isMember, err := db.IsWorkspaceMember(database, sourceWorkspaceID, userID)
    if err != nil || !isMember {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of source workspace"})
        return
    }
    
    var req struct {
        Name        string `json:"name"`
        ParentID    *int   `json:"parent_id"`
        WorkspaceID *int   `json:"workspace_id"`
    }
    if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }
    
    // If moving to a different workspace, verify user is member there too
    if req.WorkspaceID != nil && *req.WorkspaceID != sourceWorkspaceID {
        isMember, err := db.IsWorkspaceMember(database, *req.WorkspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of target workspace"})
            return
        }
    }
    
    err = db.UpdateFolderWithCascade(database, folderID, req.Name, req.ParentID, req.WorkspaceID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update folder: %v", err)})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Folder updated"})
})

    folderGroup.DELETE("/:folder_id", func(c *gin.Context) {
        folderID, _ := strconv.Atoi(c.Param("folder_id"))
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        err = db.DeleteFolder(database, folderID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete folder"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "Folder deleted"})
    })

    // --- Notes CRUD Endpoints (with tags) ---
    notesGroup := workspaceGroup.Group("/:id/notes")

notesGroup.POST("", func(c *gin.Context) {
    workspaceID, _ := strconv.Atoi(c.Param("id"))
    userID := c.GetInt("user_id")
    isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
    if err != nil || !isMember {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
        return
    }
    var req struct {
        Title    string   `json:"title"`
        FolderID *int     `json:"folder_id"`
        Tags     []string `json:"tags"`
        Color    string   `json:"color"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }
    
    // Title defaults to "Untitled" if empty (handled in CreateNote)
    noteID, err := db.CreateNote(database, workspaceID, req.Title, req.FolderID, &userID, req.Color)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create note"})
        return
    }
    if len(req.Tags) > 0 {
        if err := db.SetTagsForNote(database, noteID, req.Tags); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
    }
    
    // Return the complete note object
    note, err := db.GetNote(database, noteID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Created note but failed to retrieve"})
        return
    }
    
    // Get tags if any
    tags, _ := db.ListTagsForNote(database, noteID)
    note.Tags = tags
    
    c.JSON(http.StatusCreated, note)
})

notesGroup.GET("", func(c *gin.Context) {
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        var folderID *int
        folderIDQuery := c.Query("folder_id")
        if folderIDQuery != "" {
            id, err := strconv.Atoi(folderIDQuery)
            if err == nil {
                folderID = &id
            }
        }
        notes, err := db.ListNotes(database, workspaceID, folderID, true)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list notes"})
            return
        }
        
        // Add tags to each note
        for i := range notes {
            tags, _ := db.ListTagsForNote(database, notes[i].ID)
            notes[i].Tags = tags
        }
        
        c.JSON(http.StatusOK, notes)
    })

notesGroup.PUT("/:note_id", func(c *gin.Context) {
    noteID, _ := strconv.Atoi(c.Param("note_id"))
    userID := c.GetInt("user_id")
    
    // Get current note to verify workspace membership
    note, err := db.GetNote(database, noteID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
        return
    }
    
    // Verify user is member of source workspace
    isMember, err := db.IsWorkspaceMember(database, note.WorkspaceID, userID)
    if err != nil || !isMember {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of source workspace"})
        return
    }
    
    // Use a custom struct that can distinguish between null and absent
    var reqBody map[string]interface{}
    if err := c.ShouldBindJSON(&reqBody); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }
    
    // If moving to a different workspace, verify user is member there too
    if newWorkspaceID, exists := reqBody["workspace_id"]; exists && newWorkspaceID != nil {
        if wsID, ok := newWorkspaceID.(float64); ok && int(wsID) != note.WorkspaceID {
            isMember, err := db.IsWorkspaceMember(database, int(wsID), userID)
            if err != nil || !isMember {
                c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of target workspace"})
                return
            }
        }
    }
    
    updates := make(map[string]interface{})
    
    // Check each field - if present in request, add to updates (even if null)
    if title, exists := reqBody["title"]; exists {
        updates["title"] = title
    }
    if folderID, exists := reqBody["folder_id"]; exists {
        updates["folder_id"] = folderID // Will be nil if null in JSON
    }
    if workspaceID, exists := reqBody["workspace_id"]; exists {
        if workspaceID != nil {
            updates["workspace_id"] = workspaceID
        }
    }
    if color, exists := reqBody["color"]; exists {
        updates["color"] = color
    }
    err = db.UpdateNoteMetadata(database, noteID, updates)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update note"})
        return
    }
    
    // Return updated note
    updatedNote, err := db.GetNote(database, noteID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Updated but failed to retrieve note"})
        return
    }
    tags, _ := db.ListTagsForNote(database, noteID)
    updatedNote.Tags = tags
    
    c.JSON(http.StatusOK, updatedNote)
})

    notesGroup.GET("/:note_id", func(c *gin.Context) {
        noteID, _ := strconv.Atoi(c.Param("note_id"))
        note, err := db.GetNote(database, noteID)
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
            return
        }
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, note.WorkspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
		tags, _ := db.ListTagsForNote(database, noteID)
		note.Tags = tags
		c.JSON(http.StatusOK, note)
    })
    notesGroup.DELETE("/:note_id", func(c *gin.Context) {
        noteID, _ := strconv.Atoi(c.Param("note_id"))
        note, err := db.GetNote(database, noteID)
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
            return
        }
        userID := c.GetInt("user_id")
        isMember, err := db.IsWorkspaceMember(database, note.WorkspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        err = db.DeleteNote(database, noteID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete note"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "Note deleted permanently"})
    })


    notesGroup.PUT("/:note_id/tags", func(c *gin.Context) {
        noteID, _ := strconv.Atoi(c.Param("note_id"))
        workspaceID, _ := strconv.Atoi(c.Param("id"))
        userID := c.GetInt("user_id")
        
        // Verify note exists and user has access
        note, err := db.GetNote(database, noteID)
        if err != nil || note.WorkspaceID != workspaceID {
            c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
            return
        }
        
        isMember, err := db.IsWorkspaceMember(database, workspaceID, userID)
        if err != nil || !isMember {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
            return
        }
        
        var req struct {
            Tags []string `json:"tags"`
        }
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
            return
        }
        
        err = db.SetTagsForNote(database, noteID, req.Tags)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tags"})
            return
        }
        
        c.JSON(http.StatusOK, gin.H{"message": "Tags updated"})
    })

// Handle /yjs without trailing slash (for Hocuspocus root connection)
api.Any("/yjs", func(c *gin.Context) {
    yjsPort := os.Getenv("YJS_WS_PORT")
    if yjsPort == "" {
        yjsPort = "1234"
    }
    
    targetURL, err := url.Parse(fmt.Sprintf("http://yjs:%s", yjsPort))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Proxy configuration error"})
        return
    }
    
    proxy := httputil.NewSingleHostReverseProxy(targetURL)
    
    originalDirector := proxy.Director
    proxy.Director = func(req *http.Request) {
        originalDirector(req)
        req.Host = targetURL.Host
        req.URL.Path = "/"
        req.URL.RawQuery = c.Request.URL.RawQuery
        
        log.Printf("[PROXY] Forwarding %s %s to yjs service root: %s", req.Method, c.Request.URL.Path, req.URL.String())
    }
    
    proxy.ServeHTTP(c.Writer, c.Request)
})


// --- Yjs WebSocket Proxy ---
	api.Any("/yjs/*proxyPath", func(c *gin.Context) {
		yjsPort := os.Getenv("YJS_WS_PORT")
		if yjsPort == "" {
			yjsPort = "1234"
		}
		
		// Create target URL for yjs service
		targetURL, err := url.Parse(fmt.Sprintf("http://yjs:%s", yjsPort))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Proxy configuration error"})
			return
		}
		
		// Create reverse proxy
		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		
		// Modify the request to strip the base path and /yjs prefix
		originalDirector := proxy.Director
		proxy.Director = func(req *http.Request) {
			originalDirector(req)
			req.Host = targetURL.Host
			// Strip API_BASE_PATH and /yjs from the path
			// Example: /test/yjs/socket -> /socket
			req.URL.Path = strings.TrimPrefix(c.Request.URL.Path, basePath+"/yjs")
			if req.URL.Path == "" {
				req.URL.Path = "/"
			}
			req.URL.RawQuery = c.Request.URL.RawQuery
			
			log.Printf("[PROXY] Forwarding %s %s to yjs service: %s", req.Method, c.Request.URL.Path, req.URL.String())
		}
		
		// Handle WebSocket upgrade and proxy
		proxy.ServeHTTP(c.Writer, c.Request)
	})

// Serve static frontend files
    api.Static("/assets", "./static/assets")
    api.StaticFile("/vite.svg", "./static/vite.svg")
    
    // Root route serves index.html
    api.GET("/", func(c *gin.Context) {
        c.Header("Content-Type", "text/html")
        content, err := os.ReadFile("./static/index.html")
        if err != nil {
            c.String(500, "Error loading page")
            return
        }
        // Inject base tag
        html := string(content)
        baseTag := fmt.Sprintf(`<base href="%s/">`, basePath)
        html = strings.Replace(html, "<head>", "<head>"+baseTag, 1)
        c.String(200, html)
    })

// Catch-all for React Router - must be last
    r.NoRoute(func(c *gin.Context) {
        // Only serve index.html for routes under basePath
        if !strings.HasPrefix(c.Request.URL.Path, basePath) {
            c.String(404, "Not found")
            return
        }
        
        c.Header("Content-Type", "text/html")
        content, err := os.ReadFile("./static/index.html")
        if err != nil {
            c.String(500, "Error loading page")
            return
        }
        // Inject base tag
        html := string(content)
        baseTag := fmt.Sprintf(`<base href="%s/">`, basePath)
        html = strings.Replace(html, "<head>", "<head>"+baseTag, 1)
        c.String(200, html)
    })

    log.Printf("Listening on port %s with base path '%s'", port, basePath)
    if err := r.Run(":" + port); err != nil {
        log.Fatalf("Gin server failed: %v", err)
    }
}
