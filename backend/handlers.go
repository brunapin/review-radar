package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
)

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// helpers

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func internalError(w http.ResponseWriter, context string, err error) {
	log.Printf("ERROR [%s]: %v", context, err)
	writeError(w, http.StatusInternalServerError, "server error")
}

func decodeBody(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

// Auth handlers

func (srv *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "email and password (min 6 chars) are required")
		return
	}

	existing, err := srv.store.FindUserByEmail(req.Email)
	if err != nil {
		internalError(w, "register: find user", err)
		return
	}
	if existing != nil {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		internalError(w, "register: hash password", err)
		return
	}

	user := User{
		ID:           newID(),
		Email:        req.Email,
		PasswordHash: hash,
		CreatedAt:    time.Now().UTC(),
	}
	if err := srv.store.SaveUser(user); err != nil {
		internalError(w, "register: save user", err)
		return
	}

	token, err := generateToken(user.ID, user.Email, srv.jwtSecret)
	if err != nil {
		internalError(w, "register: generate token", err)
		return
	}
	log.Printf("INFO  [register] new user: %s", user.Email)
	writeJSON(w, http.StatusCreated, map[string]any{
		"token": token,
		"user":  map[string]string{"id": user.ID, "email": user.Email},
	})
}

func (srv *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	user, err := srv.store.FindUserByEmail(req.Email)
	if err != nil {
		internalError(w, "login: find user", err)
		return
	}
	if user == nil || !checkPassword(user.PasswordHash, req.Password) {
		log.Printf("INFO  [login] failed attempt for: %s", req.Email)
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := generateToken(user.ID, user.Email, srv.jwtSecret)
	if err != nil {
		internalError(w, "login: generate token", err)
		return
	}
	log.Printf("INFO  [login] success: %s", user.Email)
	writeJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  map[string]string{"id": user.ID, "email": user.Email},
	})
}

// App handlers

func (srv *Server) handleListApps(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(string)
	apps, err := srv.store.GetUserApps(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server error")
		return
	}
	if apps == nil {
		apps = []App{}
	}
	writeJSON(w, http.StatusOK, apps)
}

func (srv *Server) handleAddApp(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(string)

	var req struct {
		Name       string `json:"name"`
		AppStoreID string `json:"appStoreId"`
	}
	if err := decodeBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.AppStoreID = strings.TrimSpace(req.AppStoreID)
	if req.Name == "" || req.AppStoreID == "" {
		writeError(w, http.StatusBadRequest, "name and appStoreId are required")
		return
	}

	exists, err := srv.store.AppExists(userID, req.AppStoreID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server error")
		return
	}
	if exists {
		writeError(w, http.StatusConflict, "app already being monitored")
		return
	}

	app := App{
		ID:         newID(),
		Name:       req.Name,
		AppStoreID: req.AppStoreID,
		OwnerID:    userID,
		CreatedAt:  time.Now().UTC(),
	}
	if err := srv.store.SaveApp(app); err != nil {
		writeError(w, http.StatusInternalServerError, "server error")
		return
	}

	// Kick off the first poll in the background so it doesn't block the HTTP response.
	go func() {
		if err := srv.poller.pollApp(app.AppStoreID); err != nil {
			log.Printf("WARN  [addApp] initial poll failed for %s: %v", app.AppStoreID, err)
		}
	}()

	writeJSON(w, http.StatusCreated, app)
}

func (srv *Server) handleDeleteApp(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(string)
	appStoreID := r.PathValue("appStoreId")
	if appStoreID == "" {
		writeError(w, http.StatusBadRequest, "appStoreId is required")
		return
	}
	if err := srv.store.DeleteApp(userID, appStoreID); err != nil {
		writeError(w, http.StatusInternalServerError, "server error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Reviews handler

func (srv *Server) handleGetReviews(w http.ResponseWriter, r *http.Request) {
	appStoreID := r.PathValue("appStoreId")
	if appStoreID == "" {
		writeError(w, http.StatusBadRequest, "appStoreId is required")
		return
	}

	reviews, err := srv.store.GetReviews(appStoreID)
	if err != nil {
		internalError(w, "getReviews", err)
		return
	}

	if reviews == nil {
		reviews = []Review{}
	}
	writeJSON(w, http.StatusOK, reviews)
}

// Health check

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
