import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { ApiError, createApiClient } from "./api-client"

describe("createApiClient", () => {
  const schema = z.object({
    status: z.literal("ok"),
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls the correct joined URL without trailing slash duplication", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = createApiClient({
      apiBaseUrl: "http://127.0.0.1:8000/",
      sessionToken: null,
    })

    const result = await client.get("/api/health", schema)

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/health", {
      method: "GET",
      headers: {},
      body: undefined,
    })
    expect(result).toEqual({ status: "ok" })
  })

  it("attaches Bearer authorization header when sessionToken is present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = createApiClient({
      apiBaseUrl: "http://127.0.0.1:8000",
      sessionToken: "valid-session-token",
    })

    await client.get("/api/health", schema)

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/health", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-session-token",
      },
      body: undefined,
    })
  })

  it("does not attach authorization header when sessionToken is null", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = createApiClient({
      apiBaseUrl: "http://127.0.0.1:8000",
      sessionToken: null,
    })

    await client.get("/api/health", schema)

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/health", {
      method: "GET",
      headers: {},
      body: undefined,
    })
  })

  it("throws ApiError with status, detail, and path when response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: "Unauthorized" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = createApiClient({
      apiBaseUrl: "http://127.0.0.1:8000",
      sessionToken: "secret-token-12345",
    })

    try {
      await client.get("/api/protected", schema)
      expect.unreachable("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(401)
      expect(apiErr.detail).toBe("Unauthorized")
      expect(apiErr.path).toBe("/api/protected")
      expect(apiErr.message).toBe("Unauthorized")
      expect(apiErr.message).not.toContain("secret-token-12345")
    }
  })

  it("handles non-JSON error response gracefully in ApiError", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("bad gateway HTML")),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = createApiClient({
      apiBaseUrl: "http://127.0.0.1:8000",
      sessionToken: null,
    })

    try {
      await client.delete("/api/accounts/acc-1")
      expect.unreachable("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(502)
      expect(apiErr.detail).toBe("API request failed with status 502: /api/accounts/acc-1")
      expect(apiErr.path).toBe("/api/accounts/acc-1")
    }
  })

  it("throws when response data does not match schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "unexpected" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = createApiClient({
      apiBaseUrl: "http://127.0.0.1:8000",
      sessionToken: null,
    })

    await expect(client.get("/api/health", schema)).rejects.toThrow(z.ZodError)
  })
})
