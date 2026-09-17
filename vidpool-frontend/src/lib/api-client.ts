import { z } from "zod"
import type { RuntimeConfig } from "@/runtime/runtime-config"

export type ApiClient = {
  get<T>(path: string, schema: z.ZodType<T>): Promise<T>
}

export function createApiClient(config: RuntimeConfig): ApiClient {
  const normalizedBase = config.apiBaseUrl.replace(/\/+$/, "")

  return {
    async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`
      const url = `${normalizedBase}${normalizedPath}`

      const headers: Record<string, string> = {}
      if (config.sessionToken) {
        headers["Authorization"] = `Bearer ${config.sessionToken}`
      }

      const response = await fetch(url, { headers })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${url}`)
      }

      const data = await response.json()
      return schema.parse(data)
    },
  }
}
