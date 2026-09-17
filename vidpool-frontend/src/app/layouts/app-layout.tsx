import { Outlet } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "@/shared/api"
import { healthSchema } from "@/shared/api"
import { Sidebar } from "@/widgets/sidebar"
import { Topbar } from "@/widgets/topbar"

export interface AppLayoutProps {
  backendStatus?: "ok" | "pending" | "error"
}

export function AppLayout({ backendStatus: initialStatus }: AppLayoutProps) {
  const client = useApiClient()

  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => client.get("/api/health", healthSchema),
    enabled: initialStatus === undefined,
  })

  const backendStatus =
    initialStatus ??
    (health.data?.status === "ok"
      ? "ok"
      : health.isError
      ? "error"
      : "pending")

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Left Sidebar */}
      <Sidebar backendStatus={backendStatus} />

      {/* Main Studio Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Dynamic Outlet Area */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
