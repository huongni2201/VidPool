import { z } from "zod"
import type { RuntimeConfig } from "@/runtime/runtime-config"

export type ApiClient = {
  get<T>(path: string, schema: z.ZodType<T>): Promise<T>
  post<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
  delete(path: string): Promise<void>
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

  return {
    async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
      const url = buildUrl(path)
      const response = await fetch(url, { headers: buildHeaders() })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${url}`)
      }

      const data = await response.json()
      return schema.parse(data)
    },

    async post<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T> {
      const url = buildUrl(path)
      const hasBody = body !== undefined
      const response = await fetch(url, {
        method: "POST",
        headers: buildHeaders(hasBody),
        body: hasBody ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        let detail = `status ${response.status}`
        try {
          const errData = await response.json()
          if (errData && typeof errData === "object" && "detail" in errData) {
            detail = String(errData.detail)
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(`API request failed (${detail}): ${url}`)
      }

      if (schema) {
        const data = await response.json()
        return schema.parse(data)
      }
      return undefined as unknown as T
    },

    async delete(path: string): Promise<void> {
      const url = buildUrl(path)
      const response = await fetch(url, {
        method: "DELETE",
        headers: buildHeaders(),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${url}`)
      }
    },
  }
}
