package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// Store is the persistence interface. Both JSONStore and PGStore implement it.
type Store interface {
	GetUsers() ([]User, error)
	SaveUser(User) error
	FindUserByEmail(email string) (*User, error)

	GetApps() ([]App, error)
	GetUserApps(userID string) ([]App, error)
	SaveApp(App) error
	DeleteApp(userID, appStoreID string) error
	AppExists(userID, appStoreID string) (bool, error)

	GetReviews(appStoreID string) ([]Review, error)
	UpsertReviews(appStoreID string, reviews []Review) error

	Close() error
}

// ─── JSONStore ────────────────────────────────────────────────────────────────

const dataDir = "data"
const reviewsLookback = 48 * time.Hour

func reviewCutoff(now time.Time) time.Time {
	return now.UTC().Add(-reviewsLookback)
}

func recentReviews(reviews []Review, cutoff time.Time) []Review {
	recent := make([]Review, 0, len(reviews))
	for _, review := range reviews {
		if !review.UpdatedAt.Before(cutoff) {
			recent = append(recent, review)
		}
	}

	sort.Slice(recent, func(i, j int) bool {
		return recent[i].UpdatedAt.After(recent[j].UpdatedAt)
	})

	return recent
}

type JSONStore struct {
	mu sync.RWMutex
}

func NewJSONStore() (*JSONStore, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("creating data directory: %w", err)
	}
	s := &JSONStore{}
	for _, name := range []string{"users", "apps"} {
		p := s.filePath(name)
		if _, err := os.Stat(p); os.IsNotExist(err) {
			if err := os.WriteFile(p, []byte("[]\n"), 0644); err != nil {
				return nil, fmt.Errorf("initializing %s: %w", p, err)
			}
		}
	}
	abs, _ := filepath.Abs(dataDir)
	log.Printf("Using JSON file store  →  %s", abs)
	return s, nil
}

func (s *JSONStore) Close() error { return nil }

func (s *JSONStore) filePath(name string) string {
	return filepath.Join(dataDir, name+".json")
}

func readJSONFile[T any](path string) ([]T, error) {
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []T{}, nil
	}
	if err != nil {
		return nil, err
	}
	var result []T
	return result, json.Unmarshal(data, &result)
}

func writeJSONFile[T any](path string, items []T) error {
	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// Users

func (s *JSONStore) GetUsers() ([]User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return readJSONFile[User](s.filePath("users"))
}

func (s *JSONStore) SaveUser(user User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	users, err := readJSONFile[User](s.filePath("users"))
	if err != nil {
		return err
	}
	return writeJSONFile(s.filePath("users"), append(users, user))
}

func (s *JSONStore) FindUserByEmail(email string) (*User, error) {
	users, err := s.GetUsers()
	if err != nil {
		return nil, err
	}
	for _, u := range users {
		if u.Email == email {
			return &u, nil
		}
	}
	return nil, nil
}

// Apps

func (s *JSONStore) GetApps() ([]App, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return readJSONFile[App](s.filePath("apps"))
}

func (s *JSONStore) GetUserApps(userID string) ([]App, error) {
	all, err := s.GetApps()
	if err != nil {
		return nil, err
	}
	var result []App
	for _, a := range all {
		if a.OwnerID == userID {
			result = append(result, a)
		}
	}
	return result, nil
}

func (s *JSONStore) SaveApp(app App) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	apps, err := readJSONFile[App](s.filePath("apps"))
	if err != nil {
		return err
	}
	return writeJSONFile(s.filePath("apps"), append(apps, app))
}

func (s *JSONStore) DeleteApp(userID, appStoreID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	apps, err := readJSONFile[App](s.filePath("apps"))
	if err != nil {
		return err
	}
	filtered := apps[:0]
	for _, a := range apps {
		if !(a.OwnerID == userID && a.AppStoreID == appStoreID) {
			filtered = append(filtered, a)
		}
	}
	if err := writeJSONFile(s.filePath("apps"), filtered); err != nil {
		return err
	}

	// Only remove the reviews file if no other user is watching the same app.
	stillUsed := false
	for _, a := range filtered {
		if a.AppStoreID == appStoreID {
			stillUsed = true
			break
		}
	}
	if !stillUsed {
		reviewsPath := s.filePath("reviews_" + appStoreID)
		if err := os.Remove(reviewsPath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("removing reviews file: %w", err)
		}
	}
	return nil
}

func (s *JSONStore) AppExists(userID, appStoreID string) (bool, error) {
	apps, err := s.GetApps()
	if err != nil {
		return false, err
	}
	for _, a := range apps {
		if a.OwnerID == userID && a.AppStoreID == appStoreID {
			return true, nil
		}
	}
	return false, nil
}

// Reviews

func (s *JSONStore) GetReviews(appStoreID string) ([]Review, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	reviews, err := readJSONFile[Review](s.filePath("reviews_" + appStoreID))
	if err != nil {
		return nil, err
	}
	return recentReviews(reviews, reviewCutoff(time.Now())), nil
}

func (s *JSONStore) UpsertReviews(appStoreID string, incoming []Review) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, err := readJSONFile[Review](s.filePath("reviews_" + appStoreID))
	if err != nil {
		return err
	}
	index := make(map[string]int, len(existing))
	for i, r := range existing {
		index[r.ID] = i
	}
	for _, r := range incoming {
		if i, ok := index[r.ID]; ok {
			existing[i] = r
		} else {
			existing = append(existing, r)
			index[r.ID] = len(existing) - 1
		}
	}
	existing = recentReviews(existing, reviewCutoff(time.Now()))
	return writeJSONFile(s.filePath("reviews_"+appStoreID), existing)
}
