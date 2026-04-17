package main

import (
	"context"
	"os"
	"strconv"
	"testing"
	"time"
)

func newTestPGStore(t *testing.T) *PGStore {
	t.Helper()

	databaseURL := os.Getenv("PGSTORE_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set PGSTORE_TEST_DATABASE_URL to run PGStore integration tests")
	}

	store, err := NewPGStore(databaseURL)
	if err != nil {
		t.Fatalf("new pg store: %v", err)
	}
	t.Cleanup(func() {
		if err := store.Close(); err != nil {
			t.Errorf("close pg store: %v", err)
		}
	})
	return store
}

func TestPGStoreUsersAppsAndReviews(t *testing.T) {
	store := newTestPGStore(t)

	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	userID := "test-user-" + suffix
	email := "pgstore-" + suffix + "@example.com"
	appID := "test-app-" + suffix
	appStoreID := "test-app-store-" + suffix
	ctx := context.Background()

	t.Cleanup(func() {
		if _, err := store.pool.Exec(ctx, `DELETE FROM reviews WHERE app_store_id = $1`, appStoreID); err != nil {
			t.Errorf("cleanup reviews: %v", err)
		}
		if _, err := store.pool.Exec(ctx, `DELETE FROM apps WHERE id = $1`, appID); err != nil {
			t.Errorf("cleanup apps: %v", err)
		}
		if _, err := store.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID); err != nil {
			t.Errorf("cleanup users: %v", err)
		}
	})

	now := time.Now().UTC()
	user := User{
		ID:           userID,
		Email:        email,
		PasswordHash: "hashed-password",
		CreatedAt:    now,
	}
	if err := store.SaveUser(user); err != nil {
		t.Fatalf("save user: %v", err)
	}

	foundUser, err := store.FindUserByEmail(email)
	if err != nil {
		t.Fatalf("find user by email: %v", err)
	}
	if foundUser == nil || foundUser.ID != userID || foundUser.PasswordHash != user.PasswordHash {
		t.Fatalf("unexpected found user: %#v", foundUser)
	}

	app := App{
		ID:         appID,
		Name:       "PG Test App",
		AppStoreID: appStoreID,
		OwnerID:    userID,
		CreatedAt:  now,
	}
	if err := store.SaveApp(app); err != nil {
		t.Fatalf("save app: %v", err)
	}

	exists, err := store.AppExists(userID, appStoreID)
	if err != nil {
		t.Fatalf("app exists: %v", err)
	}
	if !exists {
		t.Fatal("expected app to exist")
	}

	userApps, err := store.GetUserApps(userID)
	if err != nil {
		t.Fatalf("get user apps: %v", err)
	}
	if len(userApps) != 1 || userApps[0].ID != appID {
		t.Fatalf("expected one user app, got %#v", userApps)
	}

	reviews := []Review{
		{
			ID:         "recent-review-" + suffix,
			AppStoreID: appStoreID,
			Author:     "Recent Author",
			Title:      "Fresh review",
			Content:    "Still inside the 48-hour window",
			Score:      5,
			Version:    "1.0",
			UpdatedAt:  now.Add(-2 * time.Hour),
			FetchedAt:  now,
		},
		{
			ID:         "old-review-" + suffix,
			AppStoreID: appStoreID,
			Author:     "Old Author",
			Title:      "Old review",
			Content:    "Outside the 48-hour window",
			Score:      1,
			Version:    "0.9",
			UpdatedAt:  now.Add(-72 * time.Hour),
			FetchedAt:  now,
		},
	}
	if err := store.UpsertReviews(appStoreID, reviews); err != nil {
		t.Fatalf("upsert reviews: %v", err)
	}

	gotReviews, err := store.GetReviews(appStoreID)
	if err != nil {
		t.Fatalf("get reviews: %v", err)
	}
	if len(gotReviews) != 1 || gotReviews[0].ID != reviews[0].ID {
		t.Fatalf("expected only recent review, got %#v", gotReviews)
	}

	var oldReviewCount int
	if err := store.pool.QueryRow(ctx, `SELECT COUNT(*) FROM reviews WHERE id = $1`, reviews[1].ID).Scan(&oldReviewCount); err != nil {
		t.Fatalf("count old review: %v", err)
	}
	if oldReviewCount != 0 {
		t.Fatalf("expected old review to be pruned, got count %d", oldReviewCount)
	}

	if err := store.DeleteApp(userID, appStoreID); err != nil {
		t.Fatalf("delete app: %v", err)
	}
	exists, err = store.AppExists(userID, appStoreID)
	if err != nil {
		t.Fatalf("app exists after delete: %v", err)
	}
	if exists {
		t.Fatal("expected app to be deleted")
	}

	var reviewCountAfterDelete int
	if err := store.pool.QueryRow(ctx, `SELECT COUNT(*) FROM reviews WHERE app_store_id = $1`, appStoreID).Scan(&reviewCountAfterDelete); err != nil {
		t.Fatalf("count reviews after app delete: %v", err)
	}
	if reviewCountAfterDelete != 0 {
		t.Fatalf("expected app reviews to be deleted, got count %d", reviewCountAfterDelete)
	}
}
