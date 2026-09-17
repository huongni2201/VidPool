export type Status = "idle" | "loading" | "success" | "error"

export interface ApiErrorResponse {
  detail: string
  code?: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
