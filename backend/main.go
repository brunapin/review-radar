package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

type Server struct {
	store     Store
	poller    *Poller
	jwtSecret string
}

func listenPort() string {
	if port := os.Getenv("PORT"); port != "" {
		return port
	}
	return "8080"
}

func main() {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "reviewradar-default-secret-2026"
	}

	var store Store
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		pg, err := NewPGStore(dbURL)
		if err != nil {
			log.Fatalf("connecting to postgres: %v", err)
		}
		store = pg
		log.Println("Using PostgreSQL store")
	} else {
		js, err := NewJSONStore()
		if err != nil {
			log.Fatalf("initializing JSON store: %v", err)
		}
		store = js
		log.Println("Using JSON file store")
	}

	poller := NewPoller(store)
	poller.Start()
	srv := &Server{store: store, poller: poller, jwtSecret: jwtSecret}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("POST /api/auth/register", srv.handleRegister)
	mux.HandleFunc("POST /api/auth/login", srv.handleLogin)
	mux.HandleFunc("GET /api/apps", authMiddleware(jwtSecret, srv.handleListApps))
	mux.HandleFunc("POST /api/apps", authMiddleware(jwtSecret, srv.handleAddApp))
	mux.HandleFunc("DELETE /api/apps/{appStoreId}", authMiddleware(jwtSecret, srv.handleDeleteApp))
	mux.HandleFunc("GET /api/apps/{appStoreId}/reviews", authMiddleware(jwtSecret, srv.handleGetReviews))

	handler := corsMiddleware(mux)
	port := listenPort()

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Server listening on http://localhost:%s", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
