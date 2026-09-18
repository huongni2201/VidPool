import { describe, expect, it, vi } from "vitest"
import type { ApiClient } from "@/shared/api"
import {
  deleteAccount,
  disableAccount,
  enableAccount,
  getAccount,
  listAccounts,
  validateAccount,
} from "./account-pool-api"
import { accountSummarySchema } from "@/entities/account"

describe("account-pool-api and schemas", () => {
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
      isLeased: false,
      leaseExpiresAt: null,
      isAvailable: false,
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

  it("calls getAccount, validate, enable, disable, and delete", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    const accId = "123e4567-e89b-12d3-a456-426614174000"

    await getAccount(mockClient, accId)
    expect(mockClient.get).toHaveBeenCalledWith(`/api/accounts/${accId}`, expect.anything())

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
