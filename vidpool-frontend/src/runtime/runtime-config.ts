import { z } from "zod"
import { invoke, isTauri } from "@tauri-apps/api/core"

export type RuntimeConfig = {
  apiBaseUrl: string
  sessionToken: string | null
}

export const runtimeConfigSchema = z.object({
  apiBaseUrl: z.string().url(),
  sessionToken: z.string().min(32),
})

export function getDevRuntimeConfig(): RuntimeConfig {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  const envToken = import.meta.env.VITE_SESSION_TOKEN

  return {
    apiBaseUrl:
      envUrl && envUrl.trim() !== ""
        ? envUrl
        : "http://127.0.0.1:8000",
    sessionToken:
      envToken && envToken.trim() !== ""
        ? envToken
        : null,
  }
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (isTauri()) {
    const raw = await invoke("get_runtime_config")
    return runtimeConfigSchema.parse(raw)
  }

  return getDevRuntimeConfig()
}
