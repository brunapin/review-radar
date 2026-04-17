package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const dbTimeout = 10 * time.Second

// PGStore implements Store using PostgreSQL.
type PGStore struct {
	pool *pgxpool.Pool
}

func NewPGStore(databaseURL string) (*PGStore, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connecting to postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("pinging postgres: %w", err)
	}

	s := &PGStore{pool: pool}
	if err := s.migrate(ctx); err != nil {
		return nil, fmt.Errorf("running migrations: %w", err)
	}
	return s, nil
}

func (s *PGStore) Close() error {
	s.pool.Close()
	return nil
}

// qctx returns a context with a fixed timeout for every database call.
// This prevents queries from hanging indefinitely on a cold Neon compute.
func (s *PGStore) qctx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), dbTimeout)
}

func (s *PGStore) migrate(ctx context.Context) error {
	// Create tables (no-op if already exist).
	_, err := s.pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id            TEXT PRIMARY KEY,
			email         TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS apps (
			id           TEXT PRIMARY KEY,
			name         TEXT NOT NULL,
			app_store_id TEXT NOT NULL,
			owner_id     TEXT NOT NULL DEFAULT '',
			created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS reviews (
			id           TEXT PRIMARY KEY,
			app_store_id TEXT NOT NULL,
			author       TEXT NOT NULL,
			title        TEXT NOT NULL,
			content      TEXT NOT NULL,
			score        INTEGER NOT NULL,
			version      TEXT NOT NULL DEFAULT '',
			updated_at   TIMESTAMPTZ NOT NULL,
			fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_reviews_app_store_id ON reviews(app_store_id);
		CREATE INDEX IF NOT EXISTS idx_reviews_updated_at   ON reviews(updated_at);
	`)
	if err != nil {
		return err
	}

	// Upgrade path: add owner_id / fix version nullability for older schemas.
	_, err = s.pool.Exec(ctx, `
		ALTER TABLE apps ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT '';
		ALTER TABLE apps DROP CONSTRAINT IF EXISTS apps_app_store_id_key CASCADE;
		CREATE UNIQUE INDEX IF NOT EXISTS uniq_apps_owner_app_store ON apps(owner_id, app_store_id);
		ALTER TABLE reviews ALTER COLUMN version SET DEFAULT '';
		UPDATE reviews SET version = '' WHERE version IS NULL;
		ALTER TABLE reviews ALTER COLUMN version SET NOT NULL;
	`)
	return err
}

// ─── Users ────────────────────────────────────────────────────────────────────

func (s *PGStore) GetUsers() ([]User, error) {
	ctx, cancel := s.qctx()
	defer cancel()
	rows, err := s.pool.Query(ctx,
		`SELECT id, email, password_hash, created_at FROM users`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (s *PGStore) SaveUser(u User) error {
	ctx, cancel := s.qctx()
	defer cancel()
	_, err := s.pool.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, created_at) VALUES ($1,$2,$3,$4)`,
		u.ID, u.Email, u.PasswordHash, u.CreatedAt)
	return err
}

func (s *PGStore) FindUserByEmail(email string) (*User, error) {
	ctx, cancel := s.qctx()
	defer cancel()
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, created_at FROM users WHERE email = $1`, email).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// ─── Apps ─────────────────────────────────────────────────────────────────────

func (s *PGStore) GetApps() ([]App, error) {
	ctx, cancel := s.qctx()
	defer cancel()
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, app_store_id, owner_id, created_at FROM apps ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []App
	for rows.Next() {
		var a App
		if err := rows.Scan(&a.ID, &a.Name, &a.AppStoreID, &a.OwnerID, &a.CreatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, rows.Err()
}

func (s *PGStore) GetUserApps(userID string) ([]App, error) {
	ctx, cancel := s.qctx()
	defer cancel()
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, app_store_id, owner_id, created_at FROM apps WHERE owner_id = $1 ORDER BY created_at`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []App
	for rows.Next() {
		var a App
		if err := rows.Scan(&a.ID, &a.Name, &a.AppStoreID, &a.OwnerID, &a.CreatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, rows.Err()
}

func (s *PGStore) SaveApp(a App) error {
	ctx, cancel := s.qctx()
	defer cancel()
	_, err := s.pool.Exec(ctx,
		`INSERT INTO apps (id, name, app_store_id, owner_id, created_at) VALUES ($1,$2,$3,$4,$5)`,
		a.ID, a.Name, a.AppStoreID, a.OwnerID, a.CreatedAt)
	return err
}

func (s *PGStore) DeleteApp(userID, appStoreID string) error {
	ctx, cancel := s.qctx()
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`DELETE FROM apps WHERE owner_id = $1 AND app_store_id = $2`,
		userID, appStoreID); err != nil {
		return err
	}

	var stillUsed bool
	if err := tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM apps WHERE app_store_id = $1)`,
		appStoreID).Scan(&stillUsed); err != nil {
		return err
	}

	if !stillUsed {
		if _, err := tx.Exec(ctx,
			`DELETE FROM reviews WHERE app_store_id = $1`,
			appStoreID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (s *PGStore) AppExists(userID, appStoreID string) (bool, error) {
	ctx, cancel := s.qctx()
	defer cancel()
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM apps WHERE owner_id = $1 AND app_store_id = $2)`, userID, appStoreID).
		Scan(&exists)
	return exists, err
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

func (s *PGStore) GetReviews(appStoreID string) ([]Review, error) {
	ctx, cancel := s.qctx()
	defer cancel()
	cutoff := reviewCutoff(time.Now())
	rows, err := s.pool.Query(ctx,
		`SELECT id, app_store_id, author, title, content, score, version, updated_at, fetched_at
		 FROM reviews
		 WHERE app_store_id = $1 AND updated_at >= $2
		 ORDER BY updated_at DESC`,
		appStoreID, cutoff)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []Review
	for rows.Next() {
		var r Review
		if err := rows.Scan(&r.ID, &r.AppStoreID, &r.Author, &r.Title,
			&r.Content, &r.Score, &r.Version, &r.UpdatedAt, &r.FetchedAt); err != nil {
			return nil, err
		}
		reviews = append(reviews, r)
	}
	return reviews, rows.Err()
}

func (s *PGStore) UpsertReviews(appStoreID string, reviews []Review) error {
	if len(reviews) == 0 {
		return nil
	}
	// Use a longer timeout: SendBatch is one roundtrip but Neon may need
	// a few seconds to wake up on the first call after inactivity.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cutoff := reviewCutoff(time.Now())

	// Batch all upserts + the cleanup DELETE into a single network roundtrip.
	batch := &pgx.Batch{}
	for _, r := range reviews {
		batch.Queue(`
			INSERT INTO reviews
				(id, app_store_id, author, title, content, score, version, updated_at, fetched_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			ON CONFLICT (id) DO UPDATE SET
				app_store_id = EXCLUDED.app_store_id,
				author     = EXCLUDED.author,
				title      = EXCLUDED.title,
				content    = EXCLUDED.content,
				score      = EXCLUDED.score,
				version    = EXCLUDED.version,
				updated_at = EXCLUDED.updated_at,
				fetched_at = EXCLUDED.fetched_at`,
			r.ID, r.AppStoreID, r.Author, r.Title, r.Content,
			r.Score, r.Version, r.UpdatedAt, r.FetchedAt)
	}
	batch.Queue(`DELETE FROM reviews WHERE app_store_id = $1 AND updated_at < $2`, appStoreID, cutoff)

	br := s.pool.SendBatch(ctx, batch)
	defer br.Close()

	for range reviews {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	if _, err := br.Exec(); err != nil { // DELETE
		return err
	}
	return br.Close()
}
