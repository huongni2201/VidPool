import { describe, expect, it, vi } from "vitest"
import type { ApiClient } from "@/shared/api"
import {
  cancelLogin,
  cancelNewLogin,
  cancelRelogin,
  completeLogin,
  deleteAccount,
  disableAccount,
  enableAccount,
  getAccount,
  listAccounts,
  listProviders,
  startLogin,
  startRelogin,
  validateAccount,
} from "./accounts-api"
import { accountSummarySchema } from "./types"

describe("Account API client and schemas", () => {
  it("strict schema rejects unexpected profileKey or cookie fields", () => {
    const validData = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      providerKey: "seedance",
      displayName: "Creator",
      externalIdentity: "creator-1",
      status: "active",
      lastUsedAt: null,
      lastValidatedAt: "2026-09-17T12:00:00Z",
      cooldownUntil: null,
    }

    expect(accountSummarySchema.parse(validData)).toEqual(validData)

    // Rejects extra profileKey
    expect(() =>
      accountSummarySchema.parse({
        ...validData,
        profileKey: "browser-profile/seedance/1",
      }),
    ).toThrow()

    // Rejects cookies or tokens
    expect(() =>
      accountSummarySchema.parse({
        ...validData,
        cookies: "session=xyz",
      }),
    ).toThrow()
  })

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

  it("calls listAccounts with /api/accounts", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn(),
      delete: vi.fn(),
    }

    await listAccounts(mockClient)
    expect(mockClient.get).toHaveBeenCalledWith("/api/accounts", expect.anything())

    await listAccounts(mockClient, "provider-a")
    expect(mockClient.get).toHaveBeenCalledWith(
      "/api/accounts?provider_key=provider-a",
      expect.anything(),
    )
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

  it("calls cancelLogin, startRelogin, validate, enable, disable, and delete", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    const accId = "123e4567-e89b-12d3-a456-426614174000"

    await getAccount(mockClient, accId)
    expect(mockClient.get).toHaveBeenCalledWith(`/api/accounts/${accId}`, expect.anything())

    await cancelNewLogin(mockClient, accId)
    expect(mockClient.post).toHaveBeenCalledWith(
      `/api/accounts/${accId}/login/cancel`,
    )

    await cancelLogin(mockClient, accId)
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

    await validateAccount(mockClient, accId)
    expect(mockClient.post).toHaveBeenCalledWith(
      `/api/accounts/${accId}/validate`,
      undefined,
      expect.anything(),
    )

    await enableAccount(mockClient, accId)
    expect(mockClient.post).toHaveBeenCalledWith(
      `/api/accounts/${accId}/enable`,
      undefined,
      expect.anything(),
    )

    await disableAccount(mockClient, accId)
    expect(mockClient.post).toHaveBeenCalledWith(
      `/api/accounts/${accId}/disable`,
      undefined,
      expect.anything(),
    )

    await deleteAccount(mockClient, accId)
    expect(mockClient.delete).toHaveBeenCalledWith(`/api/accounts/${accId}`)
  })
})
