package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

// rssEntry builds a minimal Apple RSS entry map.
func rssEntry(id, title, content, author, rating, version, updated string) map[string]any {
	return map[string]any{
		"id":         map[string]any{"label": id},
		"title":      map[string]any{"label": title},
		"content":    map[string]any{"label": content},
		"author":     map[string]any{"name": map[string]any{"label": author}},
		"im:rating":  map[string]any{"label": rating},
		"im:version": map[string]any{"label": version},
		"updated":    map[string]any{"label": updated},
	}
}

// mockFeedServer serves each element of pages at ?page=N.
// Pages beyond the slice return an empty feed (matching Apple's real behaviour).
func mockFeedServer(t *testing.T, pages [][]map[string]any) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var pageNum int
		fmt.Sscan(r.URL.Query().Get("page"), &pageNum)
		idx := pageNum - 1
		w.Header().Set("Content-Type", "application/json")
		var entries []map[string]any
		if idx >= 0 && idx < len(pages) {
			entries = pages[idx]
		}
		json.NewEncoder(w).Encode(map[string]any{
			"feed": map[string]any{"entry": entries},
		})
	}))
}

// overrideFeedURL replaces reviewFeedURL for the duration of the test and restores it on cleanup.
func overrideFeedURL(t *testing.T, serverURL string) {
	t.Helper()
	orig := reviewFeedURL
	reviewFeedURL = func(_ string, page int) string {
		return fmt.Sprintf("%s?page=%d", serverURL, page)
	}
	t.Cleanup(func() { reviewFeedURL = orig })
}

func TestParseReviewsFromFeedSkipsMetadataAndMapsReviews(t *testing.T) {
	now := time.Date(2026, 4, 17, 12, 0, 0, 0, time.UTC)
	body := strings.NewReader(`{
		"feed": {
			"entry": [
				{
					"id": { "label": "app-metadata" },
					"title": { "label": "App metadata entry" },
					"content": { "label": "This is not a review" },
					"updated": { "label": "2026-04-17T10:00:00Z" },
					"author": { "name": { "label": "Apple" } }
				},
				{
					"id": { "label": "review-1" },
					"title": { "label": "Great update" },
					"content": { "label": "The new dashboard is fast." },
					"updated": { "label": "2026-04-17T09:30:00-03:00" },
					"author": { "name": { "label": "Maria" } },
					"im:rating": { "label": "5" },
					"im:version": { "label": "2.4.1" }
				},
				{
					"id": { "label": "review-2" },
					"title": { "label": "Needs polish" },
					"content": { "label": "Notifications are late." },
					"updated": { "label": "not-a-date" },
					"author": { "name": { "label": "Joao" } },
					"im:rating": { "label": "2" },
					"im:version": { "label": "2.4.0" }
				}
			]
		}
	}`)

	reviews, err := parseReviewsFromFeed("123", body, now)
	if err != nil {
		t.Fatalf("parse reviews: %v", err)
	}
	if len(reviews) != 2 {
		t.Fatalf("expected two parsed reviews, got %d: %#v", len(reviews), reviews)
	}

	first := reviews[0]
	if first.ID != "review-1" ||
		first.AppStoreID != "123" ||
		first.Author != "Maria" ||
		first.Title != "Great update" ||
		first.Content != "The new dashboard is fast." ||
		first.Score != 5 ||
		first.Version != "2.4.1" {
		t.Fatalf("first review fields were not mapped correctly: %#v", first)
	}

	expectedUpdatedAt := time.Date(2026, 4, 17, 12, 30, 0, 0, time.UTC)
	if !first.UpdatedAt.Equal(expectedUpdatedAt) {
		t.Fatalf("expected parsed updatedAt %s, got %s", expectedUpdatedAt, first.UpdatedAt)
	}
	if !first.FetchedAt.Equal(now) {
		t.Fatalf("expected fetchedAt %s, got %s", now, first.FetchedAt)
	}

	second := reviews[1]
	if second.ID != "review-2" || second.Score != 2 {
		t.Fatalf("second review fields were not mapped correctly: %#v", second)
	}
	if !second.UpdatedAt.Equal(now) {
		t.Fatalf("invalid updatedAt should fall back to now: %#v", second)
	}
}

func TestReviewFeedURLUsesPagedMostRecentFeed(t *testing.T) {
	got := reviewFeedURL("389801252", 2)
	want := "https://itunes.apple.com/us/rss/customerreviews/page=2/id=389801252/sortBy=mostRecent/json"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestParseReviewsFromFeedReturnsDecodeError(t *testing.T) {
	_, err := parseReviewsFromFeed("123", strings.NewReader(`{"feed":`), time.Now().UTC())
	if err == nil {
		t.Fatal("expected decode error")
	}
	if !strings.Contains(err.Error(), "decode feed") {
		t.Fatalf("expected decode feed error, got %v", err)
	}
}

// ─── fetchReviews: pagination + deduplication ─────────────────────────────────

func TestFetchReviews_FetchesMultiplePages(t *testing.T) {
	now := time.Now().UTC()
	ts := func(h int) string { return now.Add(time.Duration(-h) * time.Hour).Format(time.RFC3339) }

	page1 := []map[string]any{rssEntry("r1", "T", "C", "A", "5", "1", ts(1))}
	page2 := []map[string]any{rssEntry("r2", "T", "C", "A", "4", "1", ts(2))}

	srv := mockFeedServer(t, [][]map[string]any{page1, page2})
	defer srv.Close()
	overrideFeedURL(t, srv.URL)

	reviews, err := fetchReviews("app1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(reviews) != 2 {
		t.Errorf("expected 2 reviews across 2 pages, got %d", len(reviews))
	}
}

func TestFetchReviews_StopsWhenPageIsAllOld(t *testing.T) {
	now := time.Now().UTC()
	recent := rssEntry("r1", "T", "C", "A", "5", "1", now.Add(-1*time.Hour).Format(time.RFC3339))
	old := rssEntry("r2", "T", "C", "A", "1", "1", now.Add(-72*time.Hour).Format(time.RFC3339))

	// page1 has a recent review, page2 has only old reviews → should stop after page2.
	srv := mockFeedServer(t, [][]map[string]any{{recent}, {old}})
	defer srv.Close()
	overrideFeedURL(t, srv.URL)

	reviews, err := fetchReviews("app1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(reviews) != 1 || reviews[0].ID != "r1" {
		t.Errorf("expected only the recent review; got %d: %+v", len(reviews), reviews)
	}
}

func TestFetchReviews_DeduplicatesAcrossPages(t *testing.T) {
	now := time.Now().UTC()
	dup := rssEntry("dup-id", "T", "C", "A", "5", "1", now.Add(-1*time.Hour).Format(time.RFC3339))

	// Same review ID appears on both pages (Apple feeds can overlap).
	srv := mockFeedServer(t, [][]map[string]any{{dup}, {dup}})
	defer srv.Close()
	overrideFeedURL(t, srv.URL)

	reviews, err := fetchReviews("app1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(reviews) != 1 {
		t.Errorf("expected 1 deduplicated review, got %d", len(reviews))
	}
}

func TestFetchReviews_SortedNewestFirst(t *testing.T) {
	now := time.Now().UTC()
	older := rssEntry("old", "T", "C", "A", "3", "1", now.Add(-5*time.Hour).Format(time.RFC3339))
	newer := rssEntry("new", "T", "C", "A", "5", "1", now.Add(-1*time.Hour).Format(time.RFC3339))

	srv := mockFeedServer(t, [][]map[string]any{{older, newer}})
	defer srv.Close()
	overrideFeedURL(t, srv.URL)

	reviews, err := fetchReviews("app1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(reviews) < 2 {
		t.Fatalf("expected 2 reviews, got %d", len(reviews))
	}
	if reviews[0].ID != "new" {
		t.Errorf("expected newest review first, got %q", reviews[0].ID)
	}
}
