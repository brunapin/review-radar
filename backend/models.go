package main

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"passwordHash"` // only used for file/DB storage; never included in API responses
	CreatedAt    time.Time `json:"createdAt"`
}

type App struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	AppStoreID string    `json:"appStoreId"`
	OwnerID    string    `json:"ownerId"`
	CreatedAt  time.Time `json:"createdAt"`
}

type Review struct {
	ID         string    `json:"id"`
	AppStoreID string    `json:"appStoreId"`
	Author     string    `json:"author"`
	Title      string    `json:"title"`
	Content    string    `json:"content"`
	Score      int       `json:"score"`
	Version    string    `json:"version"`
	UpdatedAt  time.Time `json:"updatedAt"`
	FetchedAt  time.Time `json:"fetchedAt"`
}

// RSS feed response types

type RSSFeed struct {
	Feed struct {
		Entry []RSSEntry `json:"entry"`
	} `json:"feed"`
}

type RSSEntry struct {
	ID      LabelField `json:"id"`
	Title   LabelField `json:"title"`
	Content LabelField `json:"content"`
	Updated LabelField `json:"updated"`
	Author  struct {
		Name LabelField `json:"name"`
	} `json:"author"`
	Rating  LabelField `json:"im:rating"`
	Version LabelField `json:"im:version"`
}

type LabelField struct {
	Label string `json:"label"`
}
