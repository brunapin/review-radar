package main

import (
	"context"
	"strconv"
	"testing"
	"time"
)

// Complementary PGStore tests — the broad happy-path is already covered in
// pg_store_test.go (TestPGStoreUsersAppsAndReviews). This file adds targeted
// edge-case tests that benefit from isolated setup/teardown.

func TestPGStore_FindUserByEmail_ReturnsNilForUnknownEmail(t *testing.T) {
	store := newTestPGStore(t)

	found, err := store.FindUserByEmail("definitely-does-not-exist@test.invalid")
	if err != nil {
		t.Fatalf("FindUserByEmail: %v", err)
	}
	if found != nil {
		t.Errorf("expected nil for unknown email, got %+v", found)
	}
}

func TestPGStore_AppNotVisibleToOtherOwner(t *testing.T) {
	store := newTestPGStore(t)

	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	ownerID := "test-owner-" + suffix
	appStoreID := "test-storeid-" + suffix
	app := App{
		ID:         "test-app-" + suffix,
		Name:       "Isolation Test",
		AppStoreID: appStoreID,
		OwnerID:    ownerID,
		CreatedAt:  time.Now().UTC(),
	}
	ctx := context.Background()
	t.Cleanup(func() {
		store.pool.Exec(ctx, `DELETE FROM apps WHERE id = $1`, app.ID)
	})

	if err := store.SaveApp(app); err != nil {
		t.Fatalf("SaveApp: %v", err)
	}

	exists, err := store.AppExists("different-owner", appStoreID)
	if err != nil {
		t.Fatalf("AppExists: %v", err)
	}
	if exists {
		t.Error("app should not be visible to a different owner")
	}
}

func TestPGStore_UpsertReviews_UpdatesExistingReviewInPlace(t *testing.T) {
	store := newTestPGStore(t)

	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	appStoreID := "test-upsert-app-" + suffix
	ctx := context.Background()
	t.Cleanup(func() {
		store.pool.Exec(ctx, `DELETE FROM reviews WHERE app_store_id = $1`, appStoreID)
	})

	now := time.Now().UTC()
	rev := Review{
		ID:         "test-upsert-rev-" + suffix,
		AppStoreID: appStoreID,
		Author:     "Carol",
		Title:      "Original",
		Content:    "original content",
		Score:      3,
		Version:    "1.0",
		UpdatedAt:  now.Add(-1 * time.Hour),
		FetchedAt:  now,
	}

	if err := store.UpsertReviews(appStoreID, []Review{rev}); err != nil {
		t.Fatalf("first UpsertReviews: %v", err)
	}

	updated := rev
	updated.Score = 5
	updated.Content = "updated content"
	if err := store.UpsertReviews(appStoreID, []Review{updated}); err != nil {
		t.Fatalf("second UpsertReviews: %v", err)
	}

	got, err := store.GetReviews(appStoreID)
	if err != nil {
		t.Fatalf("GetReviews: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("upsert must not create a duplicate; got %d rows", len(got))
	}
	if got[0].Score != 5 || got[0].Content != "updated content" {
		t.Errorf("review not updated in place: %+v", got[0])
	}
}
