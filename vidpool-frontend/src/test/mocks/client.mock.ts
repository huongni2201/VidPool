import { vi } from "vitest"
import type { ApiClient } from "@/shared/api"
import { createMockAccount, createMockProvider } from "../fixtures"

export function createMockApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn().mockImplementation((path: string) => {
      if (path === "/api/health") return Promise.resolve({ status: "ok" })
      if (path === "/api/session/probe") return Promise.resolve({ status: "ok" })
      if (path === "/api/providers") return Promise.resolve([createMockProvider()])
      if (path.startsWith("/api/accounts")) return Promise.resolve([createMockAccount()])
      return Promise.resolve({ status: "ok" })
    }),
    post: vi.fn().mockImplementation((path: string) => {
      if (path.includes("/login/start")) {
        return Promise.resolve({ accountId: "123e4567-e89b-12d3-a456-426614174000", status: "waiting_for_user" })
      }
      return Promise.resolve(createMockAccount())
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}
