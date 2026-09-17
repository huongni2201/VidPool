import { describe, expect, it, vi } from "vitest"
import type { ApiClient } from "@/shared/api"
import {
  cancelNewLogin,
  cancelRelogin,
  completeLogin,
  listProviders,
  startLogin,
  startRelogin,
} from "./account-login-api"

describe("account-login-api", () => {
  it("calls listProviders with /api/providers", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue([
        { key: "test-p", displayName: "Test", authKind: "browser_session" },
      ]),
      post: vi.fn(),
      delete: vi.fn(),
    }

    const res = await listProviders(mockClient)
    expect(mockClient.get).toHaveBeenCalledWith("/api/providers", expect.anything())
    expect(res).toHaveLength(1)
  })

  it("calls startLogin with correct path", async () => {
    const mockClient: ApiClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        status: "waiting_for_user",
      }),
      delete: vi.fn(),
    }

    const res = await startLogin(mockClient, "provider-x")
    expect(mockClient.post).toHaveBeenCalledWith(
      "/api/providers/provider-x/accounts/login/start",
      undefined,
      expect.anything(),
    )
    expect(res.accountId).toBe("123e4567-e89b-12d3-a456-426614174000")
  })

  it("calls completeLogin without browserSessionId payload", async () => {
    const mockClient: ApiClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        id: "123e4567-e89b-12d3-a456-426614174000",
        providerKey: "provider-x",
        displayName: "User",
        externalIdentity: "u-1",
        status: "active",
        lastUsedAt: null,
        lastValidatedAt: null,
        cooldownUntil: null,
      }),
      delete: vi.fn(),
    }

    await completeLogin(mockClient, "123e4567-e89b-12d3-a456-426614174000")
    expect(mockClient.post).toHaveBeenCalledWith(
      "/api/accounts/123e4567-e89b-12d3-a456-426614174000/login/complete",
      undefined,
      expect.anything(),
    )
  })

  it("calls cancelNewLogin, cancelRelogin, and startRelogin", async () => {
    const mockClient: ApiClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
    }

    const accId = "123e4567-e89b-12d3-a456-426614174000"

    await cancelNewLogin(mockClient, accId)
    expect(mockClient.post).toHaveBeenCalledWith(
      `/api/accounts/${accId}/login/cancel`,
    )

    await cancelRelogin(mockClient, accId)
    expect(mockClient.post).toHaveBeenCalledWith(
      `/api/accounts/${accId}/relogin/cancel`,
      undefined,
      expect.anything(),
    )

    await startRelogin(mockClient, accId)
    expect(mockClient.post).toHaveBeenCalledWith(
      `/api/accounts/${accId}/relogin/start`,
      undefined,
      expect.anything(),
    )
  })
})
