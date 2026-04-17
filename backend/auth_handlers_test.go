package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func postJSON(handler http.HandlerFunc, path string, body any) *httptest.ResponseRecorder {
	payload, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func TestAuthHandlersRegisterHashesPasswordAndLoginSucceeds(t *testing.T) {
	useTempWorkingDir(t)

	store, err := NewJSONStore()
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	srv := &Server{store: store, jwtSecret: "test-secret"}

	password := "correct horse battery staple"
	registerRec := postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email":    "  USER@example.com  ",
		"password": password,
	})

	if registerRec.Code != http.StatusCreated {
		t.Fatalf("expected register 201, got %d: %s", registerRec.Code, registerRec.Body.String())
	}

	var registerResponse struct {
		Token string `json:"token"`
		User  User   `json:"user"`
	}
	if err := json.NewDecoder(registerRec.Body).Decode(&registerResponse); err != nil {
		t.Fatalf("decode register response: %v", err)
	}
	if registerResponse.User.Email != "user@example.com" {
		t.Fatalf("expected normalized email in response, got %q", registerResponse.User.Email)
	}
	if _, err := validateToken(registerResponse.Token, srv.jwtSecret); err != nil {
		t.Fatalf("register token should be valid: %v", err)
	}

	users, err := store.GetUsers()
	if err != nil {
		t.Fatalf("get users: %v", err)
	}
	if len(users) != 1 {
		t.Fatalf("expected one stored user, got %d", len(users))
	}
	if users[0].PasswordHash == password {
		t.Fatal("stored password was not hashed")
	}
	if !checkPassword(users[0].PasswordHash, password) {
		t.Fatal("stored password hash does not verify original password")
	}

	loginRec := postJSON(srv.handleLogin, "/api/auth/login", map[string]string{
		"email":    "USER@example.com",
		"password": password,
	})
	if loginRec.Code != http.StatusOK {
		t.Fatalf("expected login 200, got %d: %s", loginRec.Code, loginRec.Body.String())
	}

	var loginResponse struct {
		Token string `json:"token"`
		User  User   `json:"user"`
	}
	if err := json.NewDecoder(loginRec.Body).Decode(&loginResponse); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if loginResponse.User.ID != users[0].ID || loginResponse.User.Email != users[0].Email {
		t.Fatalf("login returned unexpected user: %#v", loginResponse.User)
	}
	if _, err := validateToken(loginResponse.Token, srv.jwtSecret); err != nil {
		t.Fatalf("login token should be valid: %v", err)
	}
}

func TestAuthHandlersRejectDuplicateEmail(t *testing.T) {
	useTempWorkingDir(t)

	store, err := NewJSONStore()
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	srv := &Server{store: store, jwtSecret: "test-secret"}

	first := postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email":    "duplicate@example.com",
		"password": "password1",
	})
	if first.Code != http.StatusCreated {
		t.Fatalf("expected first register 201, got %d: %s", first.Code, first.Body.String())
	}

	second := postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email":    " DUPLICATE@example.com ",
		"password": "password2",
	})
	if second.Code != http.StatusConflict {
		t.Fatalf("expected duplicate register 409, got %d: %s", second.Code, second.Body.String())
	}
}

func TestAuthHandlersRejectBadCredentials(t *testing.T) {
	useTempWorkingDir(t)

	store, err := NewJSONStore()
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	srv := &Server{store: store, jwtSecret: "test-secret"}

	registerRec := postJSON(srv.handleRegister, "/api/auth/register", map[string]string{
		"email":    "user@example.com",
		"password": "right-password",
	})
	if registerRec.Code != http.StatusCreated {
		t.Fatalf("expected register 201, got %d: %s", registerRec.Code, registerRec.Body.String())
	}

	wrongPassword := postJSON(srv.handleLogin, "/api/auth/login", map[string]string{
		"email":    "user@example.com",
		"password": "wrong-password",
	})
	if wrongPassword.Code != http.StatusUnauthorized {
		t.Fatalf("expected wrong password 401, got %d: %s", wrongPassword.Code, wrongPassword.Body.String())
	}

	unknownUser := postJSON(srv.handleLogin, "/api/auth/login", map[string]string{
		"email":    "unknown@example.com",
		"password": "right-password",
	})
	if unknownUser.Code != http.StatusUnauthorized {
		t.Fatalf("expected unknown user 401, got %d: %s", unknownUser.Code, unknownUser.Body.String())
	}
}
