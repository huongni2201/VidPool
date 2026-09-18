import { afterEach, describe, expect, it, vi } from "vitest"
import { getDevRuntimeConfig, loadRuntimeConfig } from "./runtime-config"

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn().mockReturnValue(false),
  invoke: vi.fn(),
}))

import { invoke, isTauri } from "@tauri-apps/api/core"

describe("runtime-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe("getDevRuntimeConfig", () => {
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

  describe("loadRuntimeConfig", () => {
    it("returns dev config when not running inside Tauri", async () => {
      vi.mocked(isTauri).mockReturnValue(false)
      vi.stubEnv("VITE_API_BASE_URL", "")
      vi.stubEnv("VITE_SESSION_TOKEN", "")

      const config = await loadRuntimeConfig()
      expect(config.apiBaseUrl).toBe("http://127.0.0.1:8000")
      expect(config.sessionToken).toBeNull()
      expect(invoke).not.toHaveBeenCalled()
    })

    it("fetches and validates runtime config via invoke when running in Tauri", async () => {
      vi.mocked(isTauri).mockReturnValue(true)
      const validToken = "0123456789abcdef0123456789abcdef"
      vi.mocked(invoke).mockResolvedValueOnce({
        apiBaseUrl: "http://127.0.0.1:8123",
        sessionToken: validToken,
      })

      const config = await loadRuntimeConfig()
      expect(config.apiBaseUrl).toBe("http://127.0.0.1:8123")
      expect(config.sessionToken).toBe(validToken)
      expect(invoke).toHaveBeenCalledWith("get_runtime_config")
    })

    it("throws ZodError when Tauri invoke returns invalid config", async () => {
      vi.mocked(isTauri).mockReturnValue(true)
      vi.mocked(invoke).mockResolvedValueOnce({
        apiBaseUrl: "not-a-url",
        sessionToken: "too-short",
      })

      await expect(loadRuntimeConfig()).rejects.toThrow()
    })
  })
})
