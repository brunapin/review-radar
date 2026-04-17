package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"
)

const (
	maxReviewFeedPages = 10            // Apple's feed caps at 10 pages (~500 reviews)
	pollInterval       = 15 * time.Minute
)

type Poller struct {
	store Store
}

func NewPoller(store Store) *Poller {
	return &Poller{store: store}
}

// Start immediately polls all known apps and then re-polls on every pollInterval tick.
func (p *Poller) Start() {
	go p.pollAll()
	go func() {
		ticker := time.NewTicker(pollInterval)
		for range ticker.C {
			p.pollAll()
		}
	}()
}

func (p *Poller) pollAll() {
	apps, err := p.store.GetApps()
	if err != nil {
		log.Printf("WARN  [poller] failed to list apps: %v", err)
		return
	}
	seen := make(map[string]bool)
	for _, app := range apps {
		if seen[app.AppStoreID] {
			continue
		}
		seen[app.AppStoreID] = true
		if err := p.pollApp(app.AppStoreID); err != nil {
			log.Printf("WARN  [poller] poll failed for %s: %v", app.AppStoreID, err)
		}
	}
}

func (p *Poller) pollApp(appStoreID string) error {
	reviews, err := fetchReviews(appStoreID)
	if err != nil {
		return err
	}
	if len(reviews) == 0 {
		return nil
	}
	if err := p.store.UpsertReviews(appStoreID, reviews); err != nil {
		return fmt.Errorf("storing reviews: %w", err)
	}
	log.Printf("poller: fetched %d reviews for app %s", len(reviews), appStoreID)
	return nil
}

// reviewFeedURL is a package-level var so tests can override it with a mock server.
var reviewFeedURL = func(appStoreID string, page int) string {
	return fmt.Sprintf(
		"https://itunes.apple.com/us/rss/customerreviews/page=%d/id=%s/sortBy=mostRecent/json",
		page,
		appStoreID,
	)
}

func fetchReviews(appStoreID string) ([]Review, error) {
	client := http.Client{Timeout: 15 * time.Second}
	now := time.Now().UTC()
	cutoff := reviewCutoff(now)
	seen := make(map[string]bool)
	allReviews := make([]Review, 0)

	for page := 1; page <= maxReviewFeedPages; page++ {
		reviews, err := fetchReviewPage(&client, appStoreID, page, now)
		if err != nil {
			return nil, err
		}
		if len(reviews) == 0 {
			break
		}

		pageHasRecentReview := false
		for _, review := range reviews {
			if review.UpdatedAt.Before(cutoff) {
				continue // skip reviews older than 48h
			}
			pageHasRecentReview = true
			if seen[review.ID] {
				continue
			}
			seen[review.ID] = true
			allReviews = append(allReviews, review)
		}

		if !pageHasRecentReview {
			break
		}
	}

	sort.Slice(allReviews, func(i, j int) bool {
		return allReviews[i].UpdatedAt.After(allReviews[j].UpdatedAt)
	})

	return allReviews, nil
}

func fetchReviewPage(client *http.Client, appStoreID string, page int, now time.Time) ([]Review, error) {
	req, err := http.NewRequest(http.MethodGet, reviewFeedURL(appStoreID, page), nil)
	if err != nil {
		return nil, fmt.Errorf("creating rss request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
	req.Header.Set("User-Agent", "ReviewRadar/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("rss feed returned %s", resp.Status)
	}

	return parseReviewsFromFeed(appStoreID, resp.Body, now)
}

func parseReviewsFromFeed(appStoreID string, body io.Reader, now time.Time) ([]Review, error) {
	var feed RSSFeed
	if err := json.NewDecoder(body).Decode(&feed); err != nil {
		return nil, fmt.Errorf("decode feed: %w", err)
	}

	now = now.UTC()
	var reviews []Review

	for _, entry := range feed.Feed.Entry {
		// Skip entries without a rating; they are app metadata, not reviews.
		if entry.Rating.Label == "" {
			continue
		}

		score, _ := strconv.Atoi(entry.Rating.Label)

		updatedAt, err := time.Parse(time.RFC3339, entry.Updated.Label)
		if err != nil {
			updatedAt = now
		}

		reviews = append(reviews, Review{
			ID:         entry.ID.Label,
			AppStoreID: appStoreID,
			Author:     entry.Author.Name.Label,
			Title:      entry.Title.Label,
			Content:    entry.Content.Label,
			Score:      score,
			Version:    entry.Version.Label,
			UpdatedAt:  updatedAt.UTC(),
			FetchedAt:  now,
		})
	}

	return reviews, nil
}
