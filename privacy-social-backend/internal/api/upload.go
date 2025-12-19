package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type uploadResponse struct {
	URL string `json:"url"`
}

func (server *Server) uploadFile(ctx *gin.Context) {
	file, err := ctx.FormFile("file")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, errorResponse(fmt.Errorf("no file uploaded")))
		return
	}

	// Generate unique filename
	extension := filepath.Ext(file.Filename)
	newFilename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), extension)

	// Ensure uploads directory exists
	if err := os.MkdirAll("uploads", 0755); err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(fmt.Errorf("failed to create upload directory: %w", err)))
		return
	}

	// Save to ./uploads directory
	dst := filepath.Join("uploads", newFilename)
	if err := ctx.SaveUploadedFile(file, dst); err != nil {
		ctx.JSON(http.StatusInternalServerError, errorResponse(fmt.Errorf("failed to save file: %w", err)))
		return
	}

	// Return public URL (relative for proxy support)
	publicURL := fmt.Sprintf("/api/uploads/%s", newFilename)

	ctx.JSON(http.StatusOK, uploadResponse{
		URL: publicURL,
	})
}
