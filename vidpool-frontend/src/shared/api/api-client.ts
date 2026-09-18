import { z } from "zod"
import type { RuntimeConfig } from "@/shared/config/runtime-config"

export class ApiError extends Error {
  readonly status: number
  readonly detail: string
  readonly path: string
  readonly code?: string

  constructor(status: number, detail: string, path: string, code?: string) {
    super(detail)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
    this.path = path
    this.code = code
  }
}

export type ApiClient = {
  get<T>(path: string, schema: z.ZodType<T>): Promise<T>
  post<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
  delete(path: string): Promise<void>
}

interface RequestOptions<T> {
  body?: unknown
  schema?: z.ZodType<T>
}

export function createApiClient(config: RuntimeConfig): ApiClient {
  const normalizedBase = config.apiBaseUrl.replace(/\/+$/, "")

  function buildUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`
    return `${normalizedBase}${normalizedPath}`
  }

  function buildHeaders(hasBody = false): Record<string, string> {
    const headers: Record<string, string> = {}
    if (config.sessionToken) {
      headers["Authorization"] = `Bearer ${config.sessionToken}`
    }
    if (hasBody) {
      headers["Content-Type"] = "application/json"
    }
    return headers
  }

  async function request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    options?: RequestOptions<T>,
  ): Promise<T> {
    const url = buildUrl(path)
    const hasBody = options?.body !== undefined
    const response = await fetch(url, {
      method,
      headers: buildHeaders(hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      let detail = `API request failed with status ${response.status}: ${path}`
      let code: string | undefined
      try {
        const errData = await response.json()
        if (errData && typeof errData === "object") {
          if ("code" in errData && typeof errData.code === "string") {
            code = errData.code
          }
          if ("detail" in errData && errData.detail) {
            if (typeof errData.detail === "object" && errData.detail !== null) {
              if ("code" in errData.detail && typeof errData.detail.code === "string") {
                code = errData.detail.code
              }
              if ("message" in errData.detail && typeof errData.detail.message === "string") {
                detail = errData.detail.message
              } else {
                detail = JSON.stringify(errData.detail)
              }
            } else {
              detail = String(errData.detail)
            }
          }
        }
      } catch {
        // ignore json parse error
      }
      throw new ApiError(response.status, detail, path, code)
    }

    if (options?.schema) {
      const data = await response.json()
      return options.schema.parse(data)
    }

    return undefined as unknown as T
  }

  return {
    get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
      return request<T>("GET", path, { schema })
    },

    post<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T> {
      return request<T>("POST", path, { body, schema })
    },

    delete(path: string): Promise<void> {
      return request<void>("DELETE", path)
    },
  }
}
