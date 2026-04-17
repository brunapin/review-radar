package main

import (
	"encoding/json"
	"net/http"
	"testing"
)

// Complementary auth tests — the core happy-path and duplicate-email cases
// are already covered in auth_handlers_test.go. This file adds edge cases.

func newAuthServer(t *testing.T) *Server {
	t.Helper()
	useTempWorkingDir(t)
	store, err := NewJSONStore()
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	return &Server{store: store, jwtSecret: "test-secret"}
}

func TestRegisterPasswordTooShort(t *testing.T) {
	srv := newAuthServer(t)
	rec := postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email": "carol@example.com", "password": "hi",
	})
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for short password, got %d: %s", rec.Code, rec.Body)
	}
}

func TestRegisterMissingEmail(t *testing.T) {
	srv := newAuthServer(t)
	rec := postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email": "", "password": "validpass",
	})
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing email, got %d: %s", rec.Code, rec.Body)
	}
}

func TestLoginEmailCaseInsensitive(t *testing.T) {
	srv := newAuthServer(t)
	postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email": "Frank@Example.COM", "password": "passw0rd",
	})
	rec := postJSON(srv.handleLogin, "/api/auth/login", map[string]string{
		"email": "frank@example.com", "password": "passw0rd",
	})
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 for case-insensitive email, got %d: %s", rec.Code, rec.Body)
	}
}

func TestLoginResponseDoesNotLeakPasswordHash(t *testing.T) {
	srv := newAuthServer(t)
	postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email": "grace@example.com", "password": "abcdefg",
	})
	rec := postJSON(srv.handleLogin, "/api/auth/login", map[string]string{
		"email": "grace@example.com", "password": "abcdefg",
	})

	var body map[string]any
	json.NewDecoder(rec.Body).Decode(&body)
	user, _ := body["user"].(map[string]any)
	if _, has := user["passwordHash"]; has {
		t.Error("login response must not contain passwordHash")
	}
}

func TestLoginTokenIsValidJWT(t *testing.T) {
	srv := newAuthServer(t)
	postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email": "heidi@example.com", "password": "abcdefg",
	})
	rec := postJSON(srv.handleLogin, "/api/auth/login", map[string]string{
		"email": "heidi@example.com", "password": "abcdefg",
	})

	var body map[string]any
	json.NewDecoder(rec.Body).Decode(&body)
	token, _ := body["token"].(string)
	if token == "" {
		t.Fatal("no token in login response")
	}
	claims, err := validateToken(token, srv.jwtSecret)
	if err != nil {
		t.Fatalf("login token failed validation: %v", err)
	}
	if sub, _ := claims["sub"].(string); sub == "" {
		t.Error("token missing sub claim")
	}
}
