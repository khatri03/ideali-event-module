export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: {
    id: string
    name: string
    email: string
    role: string
    avatar?: string
  }
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}
