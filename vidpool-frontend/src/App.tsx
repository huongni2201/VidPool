import { useQuery } from "@tanstack/react-query"

import { getHealth } from "@/lib/api"

function App() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold">VidPool</h1>
        <p className="mt-2 text-muted-foreground">
          Local-first AI story video studio
        </p>

        <div className="mt-6 text-sm">
          {health.isPending && "Connecting to backend…"}
          {health.isError && "Backend unavailable"}
          {health.data?.status === "ok" && "Backend connected"}
        </div>
      </div>
    </main>
  )
}

export default App
