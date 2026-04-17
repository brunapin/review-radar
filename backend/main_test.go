package main

import "testing"

func TestListenPortUsesVercelPortWhenProvided(t *testing.T) {
	t.Setenv("PORT", "44019")

	if got := listenPort(); got != "44019" {
		t.Fatalf("expected PORT env value, got %q", got)
	}
}

func TestListenPortDefaultsToLocalDevelopmentPort(t *testing.T) {
	t.Setenv("PORT", "")

	if got := listenPort(); got != "8080" {
		t.Fatalf("expected default port 8080, got %q", got)
	}
}
