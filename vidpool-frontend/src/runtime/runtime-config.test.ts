import { afterEach, describe, expect, it, vi } from "vitest"
import { getDevRuntimeConfig } from "./runtime-config"

describe("getDevRuntimeConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns default values when environment variables are not set or empty", () => {
    vi.stubEnv("VITE_API_BASE_URL", "")
    vi.stubEnv("VITE_SESSION_TOKEN", "")

    const config = getDevRuntimeConfig()
    expect(config.apiBaseUrl).toBe("http://127.0.0.1:8000")
    expect(config.sessionToken).toBeNull()
  })

  it("returns configured environment values when present", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:9999")
    vi.stubEnv("VITE_SESSION_TOKEN", "test-session-token")

    const config = getDevRuntimeConfig()
    expect(config.apiBaseUrl).toBe("http://127.0.0.1:9999")
    expect(config.sessionToken).toBe("test-session-token")
  })
})
