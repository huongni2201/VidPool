export type RuntimeConfig = {
  apiBaseUrl: string
  sessionToken: string | null
}

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
