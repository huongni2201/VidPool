import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { createApiClient } from "./api-client"

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
      headers: {},
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
      headers: {
        Authorization: "Bearer valid-session-token",
      },
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
      headers: {},
    })
  })

  it("throws when response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: "Unauthorized" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = createApiClient({
      apiBaseUrl: "http://127.0.0.1:8000",
      sessionToken: null,
    })

    await expect(client.get("/api/protected", schema)).rejects.toThrow(
      /API request failed with status 401/,
    )
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
