import { useEffect, useState, type ReactNode } from "react"
import {
  ApiClientProvider,
  createApiClient,
  sessionProbeSchema,
  type ApiClient,
} from "@/shared/api"
import { loadRuntimeConfig, type RuntimeConfig } from "@/shared/config"

type BootstrapState =
  | { status: "loading" }
  | { status: "ready"; config: RuntimeConfig; client: ApiClient }
  | { status: "error"; error: Error }

export function Bootstrap({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootstrapState>({ status: "loading" })

  useEffect(() => {
    let active = true

    loadRuntimeConfig()
      .then(async (config) => {
        const client = createApiClient(config)
        await client.get("/api/session/probe", sessionProbeSchema)
        return { config, client }
      })
      .then(({ config, client }) => {
        if (active) {
          setState({ status: "ready", config, client })
        }
      })
      .catch((err) => {
        if (active) {
          setState({
            status: "error",
            error: err instanceof Error ? err : new Error(String(err)),
          })
        }
      })

    return () => {
      active = false
    }
  }, [])

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Starting VidPool…</div>
      </main>
    )
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-destructive">Backend unavailable</div>
      </main>
    )
  }

  return (
    <ApiClientProvider client={state.client}>
      {children}
    </ApiClientProvider>
  )
}
