export interface User {
  id: string
  email: string
}

export interface App {
  id: string
  name: string
  appStoreId: string
  createdAt: string
}

export interface Review {
  id: string
  appStoreId: string
  author: string
  title: string
  content: string
  score: number
  version: string
  updatedAt: string
  fetchedAt: string
}

export interface AuthResponse {
  token: string
  user: User
}
