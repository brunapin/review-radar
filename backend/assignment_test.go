package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func useTempWorkingDir(t *testing.T) {
	t.Helper()

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("get working directory: %v", err)
	}

	if err := os.Chdir(t.TempDir()); err != nil {
		t.Fatalf("change working directory: %v", err)
	}

	t.Cleanup(func() {
		if err := os.Chdir(originalDir); err != nil {
			t.Errorf("restore working directory: %v", err)
		}
	})
}

func TestStorePersistsReviewsAcrossRestart(t *testing.T) {
	useTempWorkingDir(t)

	store, err := NewJSONStore()
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	now := time.Now().UTC()
	review := Review{
		ID:         "review-1",
		AppStoreID: "123",
		Author:     "Reviewer",
		Title:      "Great app",
		Content:    "Helpful review content",
		Score:      5,
		UpdatedAt:  now,
		FetchedAt:  now,
	}

	if err := store.UpsertReviews("123", []Review{review}); err != nil {
		t.Fatalf("upsert review: %v", err)
	}

	restartedStore, err := NewJSONStore()
	if err != nil {
		t.Fatalf("new store after restart: %v", err)
	}

	reviews, err := restartedStore.GetReviews("123")
	if err != nil {
		t.Fatalf("get reviews after restart: %v", err)
	}
	if len(reviews) != 1 {
		t.Fatalf("expected 1 persisted review, got %d", len(reviews))
	}
	if reviews[0].Content != review.Content || reviews[0].Author != review.Author || reviews[0].Score != review.Score {
		t.Fatalf("persisted review lost required data: %#v", reviews[0])
	}

	review.Content = "Updated content"
	review.Score = 4
	if err := restartedStore.UpsertReviews("123", []Review{review}); err != nil {
		t.Fatalf("upsert existing review: %v", err)
	}

	reviews, err = restartedStore.GetReviews("123")
	if err != nil {
		t.Fatalf("get updated reviews: %v", err)
	}
	if len(reviews) != 1 {
		t.Fatalf("expected upsert to keep 1 review, got %d", len(reviews))
	}
	if reviews[0].Content != "Updated content" || reviews[0].Score != 4 {
		t.Fatalf("review was not updated in place: %#v", reviews[0])
	}
	if _, err := os.Stat(filepath.Join(dataDir, "reviews_123.json")); err != nil {
		t.Fatalf("expected persisted review file: %v", err)
	}
}

func TestGetReviewsReturnsOnlyLast48HoursNewestFirst(t *testing.T) {
	useTempWorkingDir(t)

	store, err := NewJSONStore()
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	now := time.Now().UTC()
	reviews := []Review{
		{ID: "older-recent", AppStoreID: "123", Author: "Author B", Content: "Older recent", Score: 3, UpdatedAt: now.Add(-24 * time.Hour), FetchedAt: now},
		{ID: "old", AppStoreID: "123", Author: "Author C", Content: "Too old", Score: 1, UpdatedAt: now.Add(-72 * time.Hour), FetchedAt: now},
		{ID: "newest", AppStoreID: "123", Author: "Author A", Content: "Newest recent", Score: 5, UpdatedAt: now.Add(-1 * time.Hour), FetchedAt: now},
	}
	if err := store.UpsertReviews("123", reviews); err != nil {
		t.Fatalf("upsert reviews: %v", err)
	}

	storedReviews, err := store.GetReviews("123")
	if err != nil {
		t.Fatalf("get reviews from store: %v", err)
	}
	if len(storedReviews) != 2 {
		t.Fatalf("expected store to return 2 recent reviews, got %d: %#v", len(storedReviews), storedReviews)
	}
	if storedReviews[0].ID != "newest" || storedReviews[1].ID != "older-recent" {
		t.Fatalf("store reviews are not newest first: %#v", storedReviews)
	}

	persistedReviews, err := readJSONFile[Review](filepath.Join(dataDir, "reviews_123.json"))
	if err != nil {
		t.Fatalf("read persisted reviews: %v", err)
	}
	if len(persistedReviews) != 2 {
		t.Fatalf("expected persisted store to prune old reviews, got %d: %#v", len(persistedReviews), persistedReviews)
	}

	srv := &Server{store: store}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/apps/{appStoreId}/reviews", srv.handleGetReviews)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/123/reviews", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var got []Review
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 recent reviews, got %d: %#v", len(got), got)
	}
	if got[0].ID != "newest" || got[1].ID != "older-recent" {
		t.Fatalf("reviews are not newest first: %#v", got)
	}
	if got[0].Content == "" || got[0].Author == "" || got[0].Score == 0 || got[0].UpdatedAt.IsZero() {
		t.Fatalf("response is missing required review data: %#v", got[0])
	}
}

func TestCORSMiddlewareAllowsViteDevPort(t *testing.T) {
	handler := corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/auth/register", nil)
	req.Header.Set("Origin", "http://localhost:5175")
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "content-type")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5175" {
		t.Fatalf("unexpected allowed origin: %q", got)
	}
}
