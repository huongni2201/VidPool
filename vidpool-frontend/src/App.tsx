import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "@/app/api-client-context"
import { healthSchema } from "@/lib/api"
import { AccountsPage } from "@/features/accounts/accounts-page"

function App() {
  const client = useApiClient()

  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => client.get("/api/health", healthSchema),
  })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col py-10 px-6">
        <header className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">VidPool</h1>
            <p className="text-xs text-muted-foreground">
              Local-first AI story video studio
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`size-2 rounded-full ${
                health.data?.status === "ok"
                  ? "bg-emerald-500"
                  : health.isError
                  ? "bg-destructive"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span className="text-muted-foreground">
              {health.isPending && "Starting VidPool…"}
              {health.isError && "Backend unavailable"}
              {health.data?.status === "ok" && "Backend connected"}
            </span>
          </div>
        </header>

        <section className="mt-8">
          {health.data?.status === "ok" ? (
            <AccountsPage />
          ) : (
            <div className="rounded-xl border border-border p-12 text-center text-sm text-muted-foreground">
              Đang kết nối tới máy chủ cục bộ…
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
